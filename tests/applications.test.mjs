import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { plusOneReturnPath, szocialLoginUrl } from "../lib/login-destination.ts";
import { matchesPlusOneDatabase, plusOneProjectUrl, supabaseProjectUrl } from "../lib/project-config.ts";
import { readFilters } from "../features/discover/filters.ts";
import { readApplicationFields, readReviewDecision } from "../features/applications/form.ts";

const applicant = "00000005-0000-4000-8000-000000000001";
const reviewer = "00000005-0000-4000-8000-000000000002";
const resident = "00000005-0000-4000-8000-000000000003";
const inactive = "00000005-0000-4000-8000-000000000004";
const recordId = "00000005-0000-4000-8000-000000000005";
const reason = "Synthetic eligibility check completed.";
const applicantName = "Synthetic Applicant";
const fixtureStorageKey = "synthetic-server-only-storage-key";
const fixtureAuthKey = "synthetic-main-publishable";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const sessionCookie = "sb-127-auth-token";

function sessionFor(userId, expired = false) {
  const expires = Math.floor(Date.now() / 1000) + (expired ? -60 : 3600);
  return {
    access_token: [encode({ alg: "HS256", typ: "JWT" }), encode({ sub: userId, exp: expires }), "test-only"].join("."),
    token_type: "bearer", expires_in: expired ? -60 : 3600, expires_at: expires, refresh_token: "synthetic",
    user: { id: userId, aud: "authenticated", is_anonymous: false, app_metadata: {}, user_metadata: {} },
  };
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function createMainAuthFixture() {
  const requests = [];
  const server = createServer((req, res) => {
    const { pathname, searchParams } = new URL(req.url, "http://localhost");
    requests.push(pathname);
    if (req.headers.apikey !== fixtureAuthKey) return json(res, 401, { message: "Main Auth key required" });
    if (pathname === "/auth/v1/token" && searchParams.get("grant_type") === "refresh_token") {
      return json(res, 200, sessionFor(applicant));
    }
    const claims = req.headers.authorization?.split(".")[1];
    const userId = claims ? JSON.parse(Buffer.from(claims, "base64url")).sub : null;
    if (pathname === "/auth/v1/user" && userId) {
      return json(res, 200, {
        ...sessionFor(userId).user,
        banned_until: userId === inactive ? "2099-01-01T00:00:00Z" : null,
      });
    }
    return json(res, 404, { message: "Unexpected Main Auth request" });
  });
  return { server, requests };
}

function createPlusOneStorageFixture(coverBytes, db) {
  const requests = [];
  const coverBatches = [];
  const postUploads = new Map();
  const coverUploads = new Map();
  const server = createServer(async (req, res) => {
    const { pathname, searchParams } = new URL(req.url, "http://localhost");
    requests.push(pathname);
    const reply = (status, payload) => json(res, status, payload);
    if (pathname.startsWith("/storage/v1/object/sign/plus-one-discover-covers/") && searchParams.get("token") === "fixture") {
      res.writeHead(200, { "Content-Type": "image/webp" });
      const key = pathname.split("/plus-one-discover-covers/")[1];
      return res.end(coverUploads.get(key) ?? coverBytes);
    }
    if (req.headers.apikey !== fixtureStorageKey || req.headers.authorization !== "Bearer " + fixtureStorageKey) {
      return reply(401, { message: "Plus One Storage key required" });
    }
    const postObject = pathname.match(/^\/storage\/v1\/object\/plus-one-profile-posts\/(.+)$/)?.[1];
    const coverObject = pathname.match(/^\/storage\/v1\/object\/plus-one-discover-covers\/(.+)$/)?.[1];
    if ((postObject || coverObject) && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      assert.equal(req.headers["content-type"], "image/webp");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      const bucket = postObject ? "plus-one-profile-posts" : "plus-one-discover-covers";
      const key = postObject ?? coverObject;
      await db.query("select plus_one.test_add_media_object($1, $2)", [bucket, key]);
      (postObject ? postUploads : coverUploads).set(key, bytes);
      return reply(200, { Key: bucket + "/" + key });
    }
    if (pathname === "/storage/v1/object/sign/plus-one-discover-covers" && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const batch = JSON.parse(Buffer.concat(chunks).toString());
      coverBatches.push(batch);
      return reply(200, batch.paths.map((path) => ({
        path, error: null, signedURL: "/object/sign/plus-one-discover-covers/" + path + "?token=fixture",
      })));
    }
    if (postObject && req.method === "GET") {
      if (pathname.endsWith(photoId(4) + ".webp")) return reply(404, { message: "Missing fixture photo" });
      res.writeHead(200, { "Content-Type": "image/webp" });
      return res.end(postUploads.get(postObject) ?? coverBytes);
    }
    return reply(404, { message: "Unexpected synthetic request: " + req.method + " " + pathname });
  });
  return { server, requests, coverBatches, postUploads, coverUploads };
}

const migrations = [
  "20261120073418_plus_one_foundation",
  "20261120081219_plus_one_applications",
  "20261122081817_plus_one_discover",
  "20261123090000_plus_one_profile_posts",
  "20261123093000_plus_one_member_post_publishing",
  "20261123100000_plus_one_separate_data_project",
  "20261123103000_plus_one_screening_and_team_setup",
];

async function prepareDatabase(db, beforeScreening) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable
      return nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    create function auth.jwt() returns jsonb language sql stable
      return coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
    create schema storage;
    create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (bucket_id text, name text not null, unique (bucket_id, name));
    create function storage.allow_only_operation(expected text) returns boolean language sql stable
      return coalesce(current_setting('storage.operation', true) = expected, false);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    create policy broad_fixture_storage_grant on storage.objects for all to anon, authenticated using (true) with check (true);
    create table public.profiles (id uuid primary key, display_name text);
    insert into public.profiles values ('00000000-0000-4000-8000-000000000001', 'Main only');
    grant select, update on public.profiles to authenticated;
  `);
  for (const migration of migrations) {
    if (migration === migrations.at(-1) && beforeScreening) await beforeScreening(db);
    await db.exec(await readFile("supabase/migrations/" + migration + ".sql", "utf8"));
  }
}

const directoryId = (n) => "00000008-0000-4000-8000-0000000000" + String(n).padStart(2, "0");
const postId = (n) => "00000009-0000-4000-8000-00000000000" + n;
const photoId = (n) => "00000010-0000-4000-8000-00000000000" + n;

async function seedProfilePosts(db) {
  await db.exec(`
    insert into plus_one.profile_posts (id, profile_id, published_at) values
      ('${postId(1)}', '${directoryId(12)}', now() - interval '1 day'),
      ('${postId(2)}', '${directoryId(12)}', now() - interval '1 day'),
      ('${postId(3)}', '${directoryId(12)}', null),
      ('${postId(4)}', '${directoryId(15)}', now() - interval '1 day'),
      ('${postId(5)}', '${directoryId(12)}', now() - interval '1 day'),
      ('${postId(6)}', '${directoryId(12)}', now() + interval '1 day');
    insert into plus_one.profile_post_photos (id, post_id, position, alt_text, object_key)
      select id::uuid, post_id::uuid, position, alt, post_id || '/' || id || '.webp'
      from (values
        ('${photoId(1)}', '${postId(1)}', 1, 'Portrait near the cafe'),
        ('${photoId(3)}', '${postId(2)}', 2, 'Tree lined street'),
        ('${photoId(2)}', '${postId(2)}', 1, 'Shops at the corner'),
        ('${photoId(4)}', '${postId(2)}', 3, 'Missing photo fixture'),
        ('${photoId(5)}', '${postId(3)}', 1, 'Draft fixture'),
        ('${photoId(6)}', '${postId(4)}', 1, 'Paused member fixture'),
        ('${photoId(7)}', '${postId(6)}', 1, 'Future fixture')
      ) as photos(id, post_id, position, alt);
    insert into storage.objects (bucket_id, name)
      select 'plus-one-profile-posts', object_key from plus_one.profile_post_photos
      where id <> '${photoId(4)}';
  `);
}

async function seedDirectory(db) {
  await db.exec(`
    insert into plus_one.team_member_applications
      (applicant_id, display_name, area, languages, introduction, activities, adult_attested, status)
    select ('00000007-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
      'Private applicant details', 'Mumbai', 'English', 'Private intake field', 'Coffee', true,
      case when n = 14 then 'pending' else 'approved' end
    from generate_series(1, 17) n;
    insert into plus_one.application_reviews (application_id, decision, reason, eligibility_verified, background_verified)
      select id, 'approved', 'Screened fixture', true, true from plus_one.team_member_applications where status = 'approved';
    with fixtures as (
      select n,
        ('00000008-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid as listing_id,
        ('00000007-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid as user_id
      from generate_series(1, 17) n
    )
    insert into plus_one.team_profiles
      (id, user_id, display_name, area, bio, languages, activities, hourly_rate_paise, cover_key, published_at, accepting_bookings, busy_until)
    select listing_id, user_id, 'Directory fixture ' || n,
      case when n % 2 = 0 then 'Bandra' else 'Fort' end,
      'I enjoy showing visitors around Mumbai.', array['English', 'Marathi'],
      case when n % 2 = 0 then array['coffee', 'events'] else array['walks'] end, 60000,
      case when n <> 17 then listing_id::text || '/11111111-1111-4111-8111-111111111111.webp' end,
      case when n <> 16 then now() - interval '1 day' end,
      n <> 15, case when n = 13 then now() + interval '1 hour' end
    from fixtures;
    insert into storage.objects (bucket_id, name)
      select 'plus-one-discover-covers', cover_key from plus_one.team_profiles where cover_key is not null;
    insert into storage.objects values ('unrelated-fixture-bucket', 'unrelated.webp'), (null, 'unassigned.webp');
  `);
}

test("Discover keeps directory ownership, draft listings, and covers private", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await prepareDatabase(db);
  await seedDirectory(db);
  await db.exec(await readFile("tests/database/ord07_discover.sql", "utf8"));
  assert.deepEqual(readFilters({ area: "  Bandra  ", activity: ["coffee"], after: "bad" }), {
    area: "Bandra", activity: "", after: null,
  });
});

test("Profile posts enforce eligibility and read-only access in PostgreSQL and Storage", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await prepareDatabase(db);
  await seedDirectory(db);
  await seedProfilePosts(db);
  await db.exec(await readFile("tests/database/profile-posts.sql", "utf8"));
  assert.deepEqual((await db.query("select count(*)::int as users from auth.users")).rows, [{ users: 0 }]);
});

test("Previous approvals return to review without losing their audit history", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await prepareDatabase(db, (db) => db.exec(`
    insert into plus_one.team_member_applications
      (id, applicant_id, display_name, area, languages, introduction, activities, adult_attested, status)
    values ('${recordId}', '${applicant}', 'Previously approved', 'Mumbai', 'English', 'Introduction', 'Coffee', true, 'approved');
    insert into plus_one.application_reviews (application_id, reviewer_id, decision, reason, eligibility_verified)
    values ('${recordId}', '${reviewer}', 'approved', 'Earlier private decision', true);
    insert into plus_one.team_profiles (user_id, display_name, area, bio, languages, activities, hourly_rate_paise,
      published_at, accepting_bookings)
    values ('${applicant}', 'Previously approved', 'Mumbai', 'Introduction', array['English'], array['coffee'],
      60000, now() - interval '1 day', true);
  `));
  const { rows } = await db.query(`
    select a.status, r.reason from plus_one.team_member_applications a
    join plus_one.application_review_archive r on r.application_id = a.id where a.id = $1
  `, [recordId]);
  assert.deepEqual(rows, [{ status: "pending", reason: "Earlier private decision" }]);
  assert.equal((await db.query("select count(*)::int as count from plus_one.application_reviews")).rows[0].count, 0);
  assert.deepEqual((await db.query("select accepting_bookings from plus_one.team_profiles")).rows, [{ accepting_bookings: false }]);
  assert.equal((await db.query("select has_table_privilege('plus_one_runtime', 'plus_one.application_review_archive', 'SELECT') as allowed")).rows[0].allowed, false);
});

test("Plus One login accepts known local paths and rejects external or encoded targets", () => {
  assert.equal(plusOneReturnPath("/plus-one/admin/applications/" + recordId), "/plus-one/admin/applications/" + recordId);
  for (const path of ["https://example.invalid/plus-one", "//example.invalid/plus-one", "/plus-one//example.invalid", "/plus-one/%2e%2e", "/plus-one/unknown", "/plus-one\\apply", "/plus-one\n", "/plus-one?token=secret"]) {
    assert.equal(plusOneReturnPath(path), "/plus-one");
  }
  const login = szocialLoginUrl("https://szocial.example", "/plus-one/bookings");
  assert.equal(login.pathname, "/login");
  assert.equal(login.searchParams.get("returnTo"), "/plus-one/bookings");
});

test("Hosted database and Storage configuration enforce distinct project targets", () => {
  const mainRef = "aaaaaaaaaaaaaaaaaaaa";
  const plusOneRef = "bbbbbbbbbbbbbbbbbbbb";
  const main = supabaseProjectUrl(`https://${mainRef}.supabase.co`);
  const data = plusOneProjectUrl(`https://${plusOneRef}.supabase.co/`, main);
  assert.equal(data.origin, `https://${plusOneRef}.supabase.co`);
  assert.equal(plusOneProjectUrl(main.origin + "/", main), null);
  assert.equal(plusOneProjectUrl("https://alias.example.test", main), null);
  assert.equal(plusOneProjectUrl(data.origin, null), null);
  const matches = (dsn) => matchesPlusOneDatabase(new URL(dsn), data);
  assert.ok(matches(`postgresql://plus_one_runtime@db.${plusOneRef}.supabase.co/postgres`));
  assert.ok(matches(`postgresql://plus_one_runtime.${plusOneRef}@aws-0-example.pooler.supabase.com:6543/postgres`));
  assert.equal(matches(`postgresql://plus_one_runtime@db.${mainRef}.supabase.co/postgres`), false);
  assert.equal(matches(`postgresql://plus_one_runtime.${mainRef}@aws-0-example.pooler.supabase.com:6543/postgres`), false);
  assert.equal(matches(`postgresql://postgres@db.${plusOneRef}.supabase.co/postgres`), false);
  assert.equal(matches("postgresql://plus_one_runtime@127.0.0.1:5432/postgres"), false);
});

test("database grants keep Main tables, browser roles, and other applicants outside the Plus One boundary", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await prepareDatabase(db);
  for (const name of ["ord03_foundation.sql", "ord05_applications.sql"]) {
    await db.exec(await readFile("tests/database/" + name, "utf8"));
  }
  const result = await db.query("select display_name from public.profiles");
  assert.deepEqual(result.rows, [{ display_name: "Main only" }]);
  const byRole = await db.query("select has_table_privilege('authenticated', 'public.profiles', 'select,update') as preserved");
  assert.equal(byRole.rows[0].preserved, true);
});

test("server validation trims fields, requires attestation, and validates reviewer decisions", () => {
  const form = new FormData();
  form.set("displayName", "  Example  ");
  form.set("introduction", "x".repeat(601));
  const { values, errors } = readApplicationFields(form);
  assert.equal(values.displayName, "Example");
  assert.ok(errors.adult && errors.introduction && errors.languages);
  form.set("decision", "approved");
  assert.match(readReviewDecision(form).message, /private reason/);
  form.set("reason", "  Test reason  ");
  assert.match(readReviewDecision(form).message, /adult eligibility/);
  form.set("decision", "declined");
  assert.deepEqual(readReviewDecision(form), { reason: "Test reason", decision: "declined", eligibilityVerified: false, backgroundVerified: false });
  form.set("decision", "approved");
  form.set("eligibilityVerified", "yes");
  assert.match(readReviewDecision(form).message, /background check/);
  form.set("backgroundVerified", "yes");
  assert.deepEqual(readReviewDecision(form), { reason: "Test reason", decision: "approved", eligibilityVerified: true, backgroundVerified: true });
});

test("production application submission and review work with synthetic local sessions", async (t) => {
  const db = await PGlite.create();
  await prepareDatabase(db);
  await db.query("insert into plus_one.staff_roles (user_id, role) values ($1, 'reviewer')", [reviewer]);
  await seedDirectory(db);
  await seedProfilePosts(db);
  await db.exec(`
    create function plus_one.test_failed_write() returns trigger language plpgsql as $retry$
    begin
      if new.area = 'Simulated outage' then raise exception 'Synthetic write failure'; end if;
      if new.display_name = 'Synthetic Applicant' then new.id := '${recordId}'; end if;
      return new;
    end;
    $retry$;
    create trigger test_failed_write before insert on plus_one.team_member_applications
      for each row execute function plus_one.test_failed_write();
    create function plus_one.test_unpublish_post() returns void language sql security definer set search_path = '' as $$
      update plus_one.profile_posts set published_at = null where id = '${postId(2)}';
    $$;
    create function plus_one.test_disable_post_reads() returns void language plpgsql security definer set search_path = '' as $$
    begin
      revoke select on plus_one.visible_profile_post_photos from plus_one_runtime;
    end;
    $$;
    create function plus_one.test_add_media_object(bucket_name text, object_key text) returns void language sql security definer set search_path = '' as $$
      insert into storage.objects values (bucket_name, object_key);
    $$;
    create function plus_one.test_set_applicant_rate() returns void language sql security definer set search_path = '' as $$
      update plus_one.team_profiles set hourly_rate_paise = 60000 where user_id = '${applicant}';
    $$;
    revoke all on function plus_one.test_unpublish_post(), plus_one.test_disable_post_reads() from public;
    grant execute on function plus_one.test_unpublish_post(), plus_one.test_disable_post_reads() to plus_one_runtime;
    revoke all on function plus_one.test_add_media_object(text, text), plus_one.test_set_applicant_rate() from public;
    grant execute on function plus_one.test_add_media_object(text, text), plus_one.test_set_applicant_rate() to plus_one_runtime;
    alter role plus_one_runtime login;
    set session authorization plus_one_runtime;
  `);
  const databaseReservation = createServer();
  const databasePort = await listen(databaseReservation);
  await new Promise((resolve) => databaseReservation.close(resolve));
  const database = new PGLiteSocketServer({ db, host: "127.0.0.1", port: databasePort, maxConnections: 4 });
  await database.start();

  const mainAuth = createMainAuthFixture();
  const mainAuthOrigin = "http://127.0.0.1:" + await listen(mainAuth.server);
  const fixture = createPlusOneStorageFixture(await readFile("public/dashboard/mumbai-cafe-640.webp"), db);
  const storageOrigin = "http://127.0.0.1:" + await listen(fixture.server);
  t.after(() => Promise.all([mainAuth.server, fixture.server].map((server) => new Promise((resolve) => server.close(resolve)))));
  const port = 3001;

  const origin = "http://127.0.0.1:" + port;
  const base = origin + "/plus-one";
  const next = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], {
    stdio: "inherit",
    env: {
      ...process.env, NEXT_TELEMETRY_DISABLED: "1",
      SZOCIAL_AUTH_URL: mainAuthOrigin,
      SZOCIAL_AUTH_PUBLISHABLE_KEY: fixtureAuthKey,
      PLUS_ONE_SUPABASE_URL: storageOrigin,
      PLUS_ONE_SUPABASE_SECRET_KEY: fixtureStorageKey,
      SZOCIAL_PUBLIC_ORIGIN: origin,
      PLUS_ONE_DATABASE_URL: "postgresql://plus_one_runtime@127.0.0.1:" + databasePort + "/postgres",
    },
  });
  t.after(async () => {
    if (next.exitCode === null) {
      const stopped = once(next, "exit");
      next.kill();
      await stopped;
    }
    await database.stop();
    await db.close();
  });

  let ready;
  for (let attempt = 0; attempt < 50 && next.exitCode === null; attempt++) {
    ready = await fetch(base + "/api/health", { signal: AbortSignal.timeout(1000) }).catch(() => undefined);
    if (ready?.ok) break;
    await delay(200);
  }
  assert.ok(ready?.ok, "Production website should be ready");

  const browser = await chromium.launch(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { channel: "chrome" });
  t.after(() => browser.close());
  const heading = (page, name) => page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 8000 });
  const pageFor = async (userId, width = 390) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    if (userId) await page.context().addCookies([{ url: origin, name: sessionCookie, value: "base64-" + encode(sessionFor(userId)) }]);
    return page;
  };

  const firstVisit = await fetch(base, { redirect: "manual" });
  assert.equal(firstVisit.status, 307);
  assert.equal(new URL(firstVisit.headers.get("location"), origin).searchParams.get("returnTo"), "/plus-one");
  const guest = await fetch(base + "/application?private=discard", { redirect: "manual" });
  assert.equal(guest.status, 307);
  assert.equal(guest.headers.get("cache-control"), "private, no-store");
  assert.equal(new URL(guest.headers.get("location"), origin).searchParams.get("returnTo"), "/plus-one/application");
  assert.equal((await fetch(base + "/start", { method: "POST" })).status, 401);

  const blocked = await pageFor(inactive);
  assert.equal((await blocked.goto(base + "/apply")).status(), 403);
  const expired = await pageFor();
  const expiredValue = "base64-" + encode(sessionFor(applicant, true));
  await expired.context().addCookies([{ url: origin, name: sessionCookie, value: expiredValue }]);
  const authenticated = await expired.goto(base + "/application");
  assert.equal(authenticated.status(), 200);
  assert.match(authenticated.headers()["cache-control"], /private.*no-store/);
  await heading(expired, "No application yet");
  const renewed = (await expired.context().cookies()).find(({ name }) => name === sessionCookie);
  assert.ok(renewed?.value && renewed.value !== expiredValue);
  assert.equal(renewed.path, "/");
  await expired.context().clearCookies();
  assert.equal((await expired.request.get(base + "/application", { maxRedirects: 0 })).status(), 307);

  const applicantPage = await pageFor(applicant, 320);
  await applicantPage.goto(base);
  await heading(applicantPage, "Find a Plus One");
  await applicantPage.getByRole("button", { name: "Explore Plus One" }).click();
  await applicantPage.waitForURL(base + "/dashboard");
  await applicantPage.getByRole("link", { name: "Become a Team Member" }).click();
  await heading(applicantPage, "Tell us about yourself");
  assert.ok(await applicantPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  const duplicate = await pageFor(applicant);
  await duplicate.goto(base + "/apply");
  await heading(duplicate, "Tell us about yourself");

  const fillForm = async (page, name) => {
    await page.getByLabel("Display name").fill(name);
    await page.getByLabel("City or general area").fill("Bandra");
    await page.getByLabel("Languages").fill("English and Marathi");
    await page.getByLabel("Short introduction").fill("I enjoy city walks.");
    await page.getByLabel("Preferred activities").fill("Walks");
    await page.getByRole("checkbox", { name: /at least 18/ }).check();
  };
  await fillForm(applicantPage, applicantName);
  await applicantPage.getByLabel("City or general area").fill("Simulated outage");
  await applicantPage.getByRole("button", { name: "Submit application" }).click();
  await applicantPage.getByRole("alert").filter({ hasText: "could not be saved" }).waitFor({ timeout: 8000 });
  assert.equal(await applicantPage.getByLabel("Display name").inputValue(), applicantName);
  assert.equal(await applicantPage.getByRole("checkbox", { name: /at least 18/ }).isChecked(), true);
  await applicantPage.getByLabel("City or general area").fill("Bandra");
  await applicantPage.getByRole("button", { name: "Submit application" }).click();
  await heading(applicantPage, "Pending review");
  await applicantPage.waitForURL(base + "/application", { timeout: 8000 });

  await fillForm(duplicate, "Duplicate must not replace the first submission");
  await duplicate.getByRole("button", { name: "Submit application" }).click();
  await heading(duplicate, "Pending review");
  assert.equal(await duplicate.getByText(applicantName, { exact: true }).count(), 1);
  await applicantPage.getByRole("link", { name: "Home", exact: true }).click();
  await applicantPage.getByText("Pending review", { exact: true }).waitFor();
  assert.equal(await applicantPage.getByRole("link", { name: "Continue team setup" }).count(), 0);
  await applicantPage.goto(base + "/team/setup");
  await applicantPage.waitForURL(base + "/application", { timeout: 8000 });
  await heading(applicantPage, "Pending review");

  const ordinaryPage = await pageFor(resident);
  await ordinaryPage.goto(base + "/dashboard");
  await ordinaryPage.getByRole("link", { name: "Become a Team Member" }).waitFor();
  assert.equal(await ordinaryPage.getByText("Pending review", { exact: true }).count(), 0);
  assert.equal(await ordinaryPage.getByRole("link", { name: "Review applications" }).count(), 0);
  await ordinaryPage.goto(base + "/application");
  await heading(ordinaryPage, "No application yet");
  await ordinaryPage.goto(base + "/admin/applications/" + recordId);
  await heading(ordinaryPage, "Access is unavailable for this account");
  assert.equal(await ordinaryPage.getByText(applicantName).count(), 0);

  const reviewerPage = await pageFor(reviewer, 1280);
  await reviewerPage.goto(base + "/dashboard");
  await reviewerPage.getByRole("link", { name: "Review applications" }).click();
  await reviewerPage.getByRole("link", { name: new RegExp(applicantName) }).click();
  await heading(reviewerPage, "Review application");
  await reviewerPage.getByLabel("Decision").selectOption("approved");
  await reviewerPage.getByLabel("Private reason").fill(reason);
  await reviewerPage.getByRole("button", { name: "Save decision" }).click();
  await reviewerPage.getByRole("alert").filter({ hasText: "adult eligibility" }).waitFor({ timeout: 8000 });
  assert.equal(await reviewerPage.getByLabel("Private reason").inputValue(), reason);

  await reviewerPage.getByRole("checkbox", { name: /checked the applicant/ }).check();
  await reviewerPage.getByRole("button", { name: "Save decision" }).click();
  await reviewerPage.getByRole("alert").filter({ hasText: "background check" }).waitFor();
  await reviewerPage.getByRole("checkbox", { name: /verified the applicant’s background/ }).check();
  await reviewerPage.getByRole("button", { name: "Save decision" }).click();
  await heading(reviewerPage, "Approved");
  assert.equal(await reviewerPage.getByText(reason, { exact: true }).count(), 1);
  await reviewerPage.getByRole("link", { name: "Back to queue" }).click();
  await reviewerPage.getByRole("link", { name: /Private applicant details/ }).waitFor();
  assert.equal(await reviewerPage.getByRole("link", { name: new RegExp(applicantName) }).count(), 0);
  await reviewerPage.getByRole("link", { name: "Reviewed" }).click();
  await reviewerPage.getByRole("link", { name: new RegExp(applicantName) }).waitFor({ timeout: 8000 });

  await applicantPage.goto(base + "/application");
  await heading(applicantPage, "Approved");
  assert.equal(await applicantPage.getByText(reason, { exact: true }).count(), 0);
  assert.ok(mainAuth.requests.includes("/auth/v1/token"));
  await applicantPage.goto(base + "/dashboard");
  const approvedPanel = applicantPage.getByRole("region", { name: "Team membership" });
  await approvedPanel.getByText("Approved", { exact: true }).waitFor();
  assert.equal(await approvedPanel.getByText(reason, { exact: true }).count(), 0);
  await approvedPanel.getByRole("link", { name: "Continue team setup" }).click();
  await heading(applicantPage, "Profile details");

  const declinedName = "Another Applicant";
  const declineReason = "Synthetic decline reason.";
  await ordinaryPage.goto(base + "/apply");
  await fillForm(ordinaryPage, declinedName);
  await ordinaryPage.getByRole("button", { name: "Submit application" }).click();
  await heading(ordinaryPage, "Pending review");
  await reviewerPage.goto(base + "/admin/applications");
  await reviewerPage.getByLabel("Applicant name").fill("Another");
  await reviewerPage.getByRole("button", { name: "Search" }).click();
  await reviewerPage.waitForURL((url) => url.searchParams.get("q") === "Another");
  await reviewerPage.getByRole("link", { name: new RegExp(declinedName) }).click();
  await reviewerPage.getByLabel("Decision").selectOption("declined");
  await reviewerPage.getByLabel("Private reason").fill(declineReason);
  await reviewerPage.getByRole("button", { name: "Save decision" }).click();
  await heading(reviewerPage, "Declined");

  await ordinaryPage.goto(base + "/team/setup");
  await ordinaryPage.waitForURL(base + "/application", { timeout: 8000 });
  await heading(ordinaryPage, "Declined");
  assert.equal(await ordinaryPage.getByText(declineReason, { exact: true }).count(), 0);
  assert.equal(await ordinaryPage.getByRole("link", { name: "Continue setup" }).count(), 0);
  await ordinaryPage.goto(base + "/dashboard");
  const declinedPanel = ordinaryPage.getByRole("region", { name: "Team membership" });
  await declinedPanel.getByText("Declined", { exact: true }).waitFor();
  assert.equal(await declinedPanel.getByText(declineReason, { exact: true }).count(), 0);
  assert.equal(await declinedPanel.getByRole("link", { name: "Continue team setup" }).count(), 0);

  await t.test("Discover filters, pages, signs photos in a batch, and hides unpublished profiles", async (test) => {
    const restricted = await fetch(base + "/members/" + directoryId(13), { redirect: "manual" });
    assert.equal(restricted.status, 307);
    assert.equal(new URL(restricted.headers.get("location"), origin).searchParams.get("returnTo"), "/plus-one/members/" + directoryId(13));
    const response = await ordinaryPage.goto(base + "/discover");
    await heading(ordinaryPage, "Discover");
    assert.match(response.headers()["cache-control"], /private.*no-store/);
    test.diagnostic("Loopback Discover first-page response start: " + Math.round(response.request().timing().responseStart) + " ms");

    const directory = ordinaryPage.getByRole("region", { name: "Team members" });
    await directory.getByRole("heading", { name: "Directory fixture 13", exact: true }).waitFor();
    assert.equal(await directory.getByRole("heading", { level: 3 }).count(), 12);
    assert.equal(await directory.getByText("Currently busy").count(), 1);
    assert.ok(fixture.coverBatches.some(({ paths, expiresIn }) => paths.length === 12 && expiresIn === 120));
    assert.equal(await ordinaryPage.getByText("Private intake field").count(), 0);
    assert.equal(await ordinaryPage.getByText("Directory fixture 14", { exact: true }).count(), 0);
    assert.ok(!((await ordinaryPage.content()).includes("00000007-0000-4000-8000-000000000013")));

    await ordinaryPage.getByRole("link", { name: "Next page", exact: true }).click();
    await directory.getByRole("heading", { name: "Directory fixture 1", exact: true }).waitFor();
    assert.equal(await directory.getByRole("heading", { level: 3 }).count(), 1);
    await ordinaryPage.getByRole("link", { name: "First page", exact: true }).click();
    await directory.getByRole("heading", { name: "Directory fixture 13", exact: true }).waitFor();

    const filters = ordinaryPage.getByRole("form", { name: "Filter team members" });
    const activity = filters.getByLabel("Activity", { exact: true });
    await activity.selectOption("coffee");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("activity") === "coffee");
    await directory.getByRole("heading", { name: "Directory fixture 13", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await directory.getByRole("heading", { level: 3 }).count(), 6);
    await activity.selectOption("");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("activity") === "");
    await directory.getByRole("heading", { name: "Directory fixture 13", exact: true }).waitFor();
    assert.equal(await directory.getByRole("heading", { level: 3 }).count(), 12);

    const area = filters.getByRole("combobox", { name: "Area", exact: true });
    await area.selectOption("Bandra");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("area") === "Bandra");
    await activity.selectOption("coffee");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("area") === "Bandra" && url.searchParams.get("activity") === "coffee");
    await directory.getByRole("heading", { name: "Directory fixture 13", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await directory.getByRole("heading", { level: 3 }).count(), 6);

    await area.selectOption("Fort");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("area") === "Fort" && url.searchParams.get("activity") === "coffee");
    await heading(ordinaryPage, "No matches for these filters");
    await area.selectOption({ label: "Other area…" });
    await filters.getByLabel("Custom area", { exact: true }).fill("Custom Mumbai area");
    await filters.getByRole("button", { name: "Find team members" }).click();
    await ordinaryPage.waitForURL((url) => url.searchParams.get("area") === "Custom Mumbai area");
    await heading(ordinaryPage, "No matches for these filters");
    await area.selectOption("Bandra");
    await ordinaryPage.waitForURL((url) => url.searchParams.get("area") === "Bandra" && url.searchParams.get("activity") === "coffee");
    await heading(ordinaryPage, "Directory fixture 12");
    for (const width of [320, 390, 768, 1280, 1440]) {
      await ordinaryPage.setViewportSize({ width, height: 900 });
      assert.ok(await ordinaryPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "No horizontal overflow at " + width);
    }

    await directory.getByRole("link", { name: /^Directory fixture 12/ }).click();
    await heading(ordinaryPage, "Directory fixture 12");
    await ordinaryPage.getByRole("img", { name: "Directory fixture 12’s profile photo" }).evaluate((img) => img.decode());
    assert.ok(await ordinaryPage.getByText("Private chat opens after a paid booking.").isVisible());
    await ordinaryPage.goto(base + "/members/" + directoryId(15));
    await heading(ordinaryPage, "Page not found");
    await ordinaryPage.setViewportSize({ width: 390, height: 740 });
    for (const { query, initialHeading, clearLabel } of [
      { query: "?area=Bandra", initialHeading: "Directory fixture 12", clearLabel: "Clear filters" },
      { query: "?area=Unknown&activity=walks", initialHeading: "No matches for these filters", clearLabel: "Clear directory filters" },
    ]) {
      await ordinaryPage.goto(base + "/discover" + query);
      await heading(ordinaryPage, initialHeading);
      const clear = ordinaryPage.getByRole("link", { name: clearLabel, exact: true });
      const scrollBefore = await clear.evaluate((element) => {
        element.scrollIntoView({ block: "center" });
        return window.scrollY;
      });
      assert.ok(scrollBefore > 0, "Clear filters should be tested below the top of the page");
      await clear.click();
      await ordinaryPage.waitForURL(base + "/discover");
      await heading(ordinaryPage, "Directory fixture 13");
      assert.equal(await ordinaryPage.evaluate(() => window.scrollY), scrollBefore);
    }
  });

  await t.test("A manually screened applicant can draft, publish, edit, pause and resume a listing", async () => {
    await applicantPage.setViewportSize({ width: 320, height: 820 });
    await applicantPage.goto(base + "/team/setup");
    await heading(applicantPage, "Profile details");
    assert.equal(await applicantPage.getByLabel("Display name").inputValue(), applicantName);
    await applicantPage.getByLabel("General area").fill("Colaba");
    await applicantPage.getByRole("checkbox", { name: "Coffee", exact: true }).check();
    await applicantPage.getByRole("button", { name: "Save draft" }).click();
    await applicantPage.getByRole("status").filter({ hasText: "Profile details saved." }).waitFor();
    const publish = applicantPage.getByRole("button", { name: "Publish listing" });
    assert.ok(await publish.isDisabled());

    await ordinaryPage.goto(base + "/discover?area=Colaba");
    await heading(ordinaryPage, "No matches for these filters");
    const cover = applicantPage.getByLabel("Choose cover photo");
    await cover.setInputFiles({ name: "invalid.webp", mimeType: "image/webp", buffer: Buffer.from("not an image") });
    await applicantPage.getByRole("button", { name: "Upload cover" }).click();
    await applicantPage.getByRole("alert").filter({ hasText: "cover photo could not be read" }).waitFor();
    assert.equal(fixture.coverUploads.size, 0);
    await cover.setInputFiles("public/discover/demo/meera.webp");
    await applicantPage.getByRole("button", { name: "Upload cover" }).click();
    await applicantPage.getByRole("status").filter({ hasText: "Cover photo saved." }).waitFor();
    assert.equal(fixture.coverUploads.size, 1);
    assert.ok(await publish.isDisabled());

    await db.query("select plus_one.test_set_applicant_rate()");
    await applicantPage.reload();
    await applicantPage.getByText(/₹600/).waitFor();
    assert.ok(await publish.isEnabled());
    await publish.click();
    await applicantPage.getByRole("status").filter({ hasText: "Your listing is visible in Discover." }).waitFor();
    const profileLink = await applicantPage.getByRole("link", { name: "View your profile" }).getAttribute("href");
    const profileUrl = new URL(profileLink, origin).href;
    await ordinaryPage.goto(base + "/discover?area=Colaba");
    await ordinaryPage.getByRole("link", { name: new RegExp(applicantName) }).click();
    await ordinaryPage.waitForURL(profileUrl);
    await heading(ordinaryPage, applicantName);
    await ordinaryPage.getByRole("img", { name: applicantName + "’s profile photo" }).evaluate((img) => img.decode());

    await applicantPage.getByLabel("Bio").fill("A fresh introduction for visitors.");
    await applicantPage.getByRole("button", { name: "Save details" }).click();
    await applicantPage.getByRole("status").filter({ hasText: "Profile details saved." }).waitFor();
    await ordinaryPage.reload();
    await ordinaryPage.getByText("A fresh introduction for visitors.").waitFor();
    await applicantPage.getByRole("button", { name: "Pause bookings" }).click();
    await applicantPage.getByRole("status").filter({ hasText: "New bookings paused." }).waitFor();
    await ordinaryPage.goto(profileUrl);
    await heading(ordinaryPage, "Page not found");
    await ordinaryPage.goto(base + "/discover?area=Colaba");
    await heading(ordinaryPage, "No matches for these filters");
    await applicantPage.getByRole("button", { name: "Resume bookings" }).click();
    await applicantPage.getByText("Published", { exact: true }).waitFor();
    await ordinaryPage.goto(profileUrl);
    await heading(ordinaryPage, applicantName);
    assert.ok(await applicantPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  });

  await t.test("Only an eligible profile owner can publish one ordered photo post", async () => {
    const id = directoryId(11);
    const ownerId = "00000007-0000-4000-8000-000000000011";
    const reader = await pageFor(resident);
    await reader.goto(base + "/members/" + id);
    await heading(reader, "Directory fixture 11");
    assert.equal(await reader.getByRole("link", { name: "Create post" }).count(), 0);
    await reader.goto(base + "/team/setup");
    await reader.waitForURL(base + "/application");
    assert.equal(await reader.getByRole("heading", { name: "Create post" }).count(), 0);
    const owner = await pageFor(ownerId, 320);
    await owner.goto(base + "/members/" + id);
    await owner.getByRole("link", { name: "Create post" }).click();
    await heading(owner, "Create post");
    assert.ok(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    const first = owner.getByLabel("Choose photo 1");
    const firstDescription = owner.getByLabel("Photo 1 description");
    const publish = owner.getByRole("button", { name: "Publish post" });
    await first.setInputFiles({ name: "invalid.webp", mimeType: "image/webp", buffer: Buffer.from("not an image") });
    await firstDescription.fill("Invalid fixture");
    await publish.click();
    await owner.getByRole("alert").filter({ hasText: "A photo could not be read." }).waitFor();
    assert.equal(fixture.postUploads.size, 0);

    await first.setInputFiles("public/discover/demo/meera.webp");
    await firstDescription.fill("First photo on the new post");
    await owner.getByRole("button", { name: "Add another photo" }).click();
    await owner.getByLabel("Choose photo 2").setInputFiles("public/discover/demo/arjun.webp");
    await owner.getByLabel("Photo 2 description").fill("Second photo on the new post");
    await publish.click();
    await owner.waitForURL(base + "/members/" + id + "#posts");
    assert.equal(fixture.postUploads.size, 2);

    await reader.goto(base + "/discover?area=Fort");
    await reader.getByRole("link", { name: /^Directory fixture 11/ }).click();
    const tile = reader.getByRole("button", { name: "Open post 1, 2 photos" });
    await tile.click();
    const dialog = reader.getByRole("dialog");
    await dialog.getByRole("img", { name: "First photo on the new post" }).evaluate((img) => img.decode());
    await dialog.getByRole("button", { name: "Next photo" }).click();
    await dialog.getByRole("img", { name: "Second photo on the new post" }).evaluate((img) => img.decode());
  });

  await t.test("Profile posts and sharing work from Discover", async () => {
    const profileId = directoryId(12);
    const shareUrl = base + "/members/" + profileId;
    const imgUrl = (id, memberId = profileId) => base + "/api/members/" + memberId + "/post-photos/" + id;
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await mobile.context().addCookies([{ url: origin, name: sessionCookie, value: "base64-" + encode(sessionFor(resident)) }]);
    await mobile.goto(base + "/discover?area=Bandra");
    await mobile.getByRole("link", { name: /^Directory fixture 12/ }).click();
    await heading(mobile, "Directory fixture 12");
    const posts = mobile.getByRole("region", { name: "Posts" });
    const multi = posts.getByRole("button", { name: "Open post 1, 3 photos" });
    const single = posts.getByRole("button", { name: "Open post 2, 1 photo" });
    const dialog = mobile.getByRole("dialog");
    await multi.waitFor();
    assert.equal(await posts.getByRole("button").count(), 2);
    assert.equal(await multi.locator("img").evaluate((img) => img.src), imgUrl(photoId(2)));
    await multi.click();
    await dialog.getByRole("img", { name: "Shops at the corner" }).evaluate((img) => img.decode());
    assert.equal(await dialog.getByRole("button", { name: "Previous photo" }).isDisabled(), true);

    const slide = await dialog.getByRole("img", { name: "Shops at the corner" }).boundingBox();
    const touch = await mobile.context().newCDPSession(mobile);
    const touchMove = (type, x) => touch.send("Input.dispatchTouchEvent", {
      type, touchPoints: x === undefined ? [] : [{ x, y: slide.y + slide.height / 2 }],
    });
    await touchMove("touchStart", slide.x + slide.width * 0.84);
    for (let step = 1; step <= 12; step++) {
      await touchMove("touchMove", slide.x + slide.width * (0.84 - step * 0.058));
      await delay(20);
    }
    await touchMove("touchEnd");
    await dialog.getByText("2 of 3", { exact: true }).waitFor();
    await dialog.getByRole("img", { name: "Tree lined street" }).waitFor();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await multi.evaluate((button) => document.activeElement === button), true);

    const desktop = await pageFor(resident, 1280);
    await desktop.goto(shareUrl + "?temporary=discard#fragment");
    const desktopPosts = desktop.getByRole("region", { name: "Posts" });
    for (const width of [320, 390, 768, 1280, 1440]) {
      await desktop.setViewportSize({ width, height: 900 });
      assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No overflow at " + width);
      const cover = await desktop.getByRole("img", { name: "Directory fixture 12’s profile photo" }).boundingBox();
      const gallery = await desktopPosts.boundingBox();
      const details = await desktop.getByRole("heading", { name: "Directory fixture 12" }).boundingBox();
      assert.ok(cover.y + cover.height <= gallery.y && gallery.y + gallery.height <= details.y, "Cover → posts → details at " + width);
    }
    assert.ok(await desktop.getByText("Private chat opens after a paid booking.").isVisible());
    const tile = desktopPosts.getByRole("button", { name: "Open post 1, 3 photos" });
    await tile.scrollIntoViewIfNeeded();
    const scroll = await desktop.evaluate(() => window.scrollY);
    await tile.click();
    const viewer = desktop.getByRole("dialog");
    await viewer.getByText("1 of 3", { exact: true }).waitFor();
    await desktop.keyboard.press("Tab");
    assert.ok(await viewer.evaluate((el) => el.contains(document.activeElement)));
    await viewer.getByRole("button", { name: "Next photo" }).click();
    await viewer.getByText("2 of 3", { exact: true }).waitFor();
    await desktop.keyboard.press("ArrowRight");
    await viewer.getByText("3 of 3", { exact: true }).waitFor();
    await viewer.getByText("Photo unavailable", { exact: true }).waitFor();
    assert.equal(await viewer.getByRole("button", { name: "Next photo" }).isDisabled(), true);
    await desktop.keyboard.press("ArrowLeft");
    await viewer.getByText("2 of 3", { exact: true }).waitFor();
    await desktop.keyboard.press("Escape");
    await viewer.waitFor({ state: "hidden" });
    assert.equal(await tile.evaluate((button) => document.activeElement === button), true);
    assert.equal(await desktop.evaluate(() => window.scrollY), scroll);
    await single.click();
    await dialog.getByRole("img", { name: "Portrait near the cafe" }).waitFor();
    assert.equal(await dialog.getByRole("button").count(), 1);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();

    await desktop.route(imgUrl(photoId(1)), (route) => route.abort());
    await desktop.reload();
    const failedTile = desktopPosts.getByRole("button", { name: "Open post 2, 1 photo" });
    await failedTile.scrollIntoViewIfNeeded();
    await failedTile.getByText("Photo unavailable", { exact: true }).waitFor();
    await desktop.unroute(imgUrl(photoId(1)));
    await failedTile.click();
    await viewer.getByRole("img", { name: "Portrait near the cafe" }).evaluate((img) => img.decode());
    await desktop.keyboard.press("Escape");

    await desktop.evaluate(() => {
      window.shareAttempts = [];
      Object.defineProperty(navigator, "share", { configurable: true, value: async (data) => window.shareAttempts.push(data) });
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: async (value) => window.shareAttempts.push(value),
      } });
    });
    const share = desktop.getByRole("button", { name: "Share profile" });
    await share.click();
    assert.deepEqual(await desktop.evaluate(() => window.shareAttempts), [{ title: "Directory fixture 12", url: shareUrl }]);
    await desktop.evaluate(() => {
      Object.defineProperty(navigator, "share", { value: async () => { throw new DOMException("Cancelled", "AbortError"); } });
    });
    await share.click();
    assert.equal(await desktop.evaluate(() => window.shareAttempts.length), 1);
    assert.equal(await desktop.getByText("Profile link copied", { exact: true }).count(), 0);
    await desktop.evaluate(() => {
      Object.defineProperty(navigator, "share", { value: async () => { throw new DOMException("Failed", "NotAllowedError"); } });
    });
    await share.click();
    await desktop.getByRole("status").filter({ hasText: "Profile link copied" }).waitFor();
    assert.equal(await desktop.evaluate(() => window.shareAttempts.at(-1)), shareUrl);
    await desktop.evaluate(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new DOMException("Blocked", "NotAllowedError"); } } });
    });
    await share.click();
    const manual = desktop.getByRole("textbox", { name: "Profile link" });
    assert.equal(await manual.inputValue(), shareUrl);
    await manual.focus();
    assert.equal(await manual.evaluate((input) => input.selectionEnd - input.selectionStart), shareUrl.length);

    const recipient = await pageFor(applicant);
    await recipient.goto(shareUrl);
    await heading(recipient, "Directory fixture 12");
    const guest = await fetch(shareUrl, { redirect: "manual" });
    assert.equal(guest.status, 307);
    const login = new URL(guest.headers.get("location"), origin);
    assert.equal(login.pathname, "/login");
    assert.equal(login.searchParams.get("returnTo"), new URL(shareUrl).pathname);
    assert.equal((await fetch(imgUrl(photoId(2)))).status, 401);
    const photo = await recipient.request.get(imgUrl(photoId(2)));
    assert.equal(photo.status(), 200);
    assert.equal(photo.headers()["cache-control"], "private, no-store");
    for (const [id, memberId] of [[photoId(5), profileId], [photoId(6), directoryId(15)], [photoId(7), profileId], [photoId(2), directoryId(13)]]) {
      assert.equal((await recipient.request.get(imgUrl(id, memberId))).status(), 404);
    }
    assert.equal((await recipient.request.post(imgUrl(photoId(2)))).status(), 405);
    await recipient.goto(base + "/members/" + directoryId(15));
    await heading(recipient, "Page not found");
    await recipient.goto(base + "/members/" + directoryId(13));
    await heading(recipient, "Directory fixture 13");
    assert.ok(await recipient.getByRole("button", { name: "Share profile" }).isVisible());
    assert.equal(await recipient.getByRole("heading", { name: "Posts", exact: true }).count(), 0);

    await db.query("select plus_one.test_unpublish_post()");
    assert.equal((await recipient.request.get(imgUrl(photoId(2)))).status(), 404);
    await db.query("select plus_one.test_disable_post_reads()");
    await recipient.goto(shareUrl);
    await heading(recipient, "Directory fixture 12");
    assert.ok(await recipient.getByText("Posts are temporarily unavailable.", { exact: true }).isVisible());
    assert.ok(await recipient.getByRole("img", { name: "Directory fixture 12’s profile photo" }).isVisible());
  });
  assert.ok(mainAuth.requests.every((pathname) => pathname.startsWith("/auth/v1/")));
  assert.ok(fixture.requests.length > 0 && fixture.requests.every((pathname) => pathname.startsWith("/storage/v1/")));
  const directRead = await fetch(storageOrigin + "/storage/v1/object/plus-one-profile-posts/" + postId(1) + "/" + photoId(1) + ".webp", {
    headers: { apikey: fixtureAuthKey, Authorization: "Bearer " + sessionFor(resident).access_token },
  });
  assert.equal(directRead.status, 401);
  await assert.rejects(db.query("select count(*) from auth.users"), { code: "42501" });
});
