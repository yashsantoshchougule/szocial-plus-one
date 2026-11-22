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
import { readFilters } from "../features/discover/filters.ts";
import { readApplicationFields, readReviewDecision } from "../features/applications/form.ts";

const applicant = "00000005-0000-4000-8000-000000000001";
const reviewer = "00000005-0000-4000-8000-000000000002";
const resident = "00000005-0000-4000-8000-000000000003";
const inactive = "00000005-0000-4000-8000-000000000004";
const recordId = "00000005-0000-4000-8000-000000000005";
const reason = "Synthetic eligibility check completed.";
const applicantName = "Synthetic Applicant";

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

function createSupabaseFixture(coverBytes) {
  const requests = [];
  const coverBatches = [];
  const server = createServer(async (req, res) => {
    const { pathname, searchParams } = new URL(req.url, "http://localhost");
    requests.push(pathname);
    const reply = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (pathname === "/auth/v1/token" && searchParams.get("grant_type") === "refresh_token") {
      return reply(200, sessionFor(applicant));
    }
    const claims = req.headers.authorization?.split(".")[1];
    const userId = claims ? JSON.parse(Buffer.from(claims, "base64url")).sub : null;
    if (pathname === "/auth/v1/user" && userId) {
      return reply(200, {
        ...sessionFor(userId).user,
        banned_until: userId === inactive ? "2099-01-01T00:00:00Z" : null,
      });
    }
    if (pathname === "/storage/v1/object/sign/plus-one-discover-covers" && req.method === "POST" && userId) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const batch = JSON.parse(Buffer.concat(chunks).toString());
      coverBatches.push(batch);
      return reply(200, batch.paths.map((path) => ({
        path, error: null, signedURL: "/object/sign/plus-one-discover-covers/" + path + "?token=fixture",
      })));
    }
    if (pathname.startsWith("/storage/v1/object/sign/plus-one-discover-covers/") && searchParams.get("token") === "fixture") {
      res.writeHead(200, { "Content-Type": "image/webp" });
      return res.end(coverBytes);
    }
    return reply(404, { message: "Unexpected synthetic request: " + req.method + " " + pathname });
  });
  return { server, requests, coverBatches };
}

const migrations = [
  "20261120073418_plus_one_foundation",
  "20261120081219_plus_one_applications",
  "20261122081817_plus_one_discover",
];

async function prepareDatabase(db) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      return nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    create function auth.jwt() returns jsonb language sql stable
      return coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
    create schema storage;
    create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (bucket_id text, name text not null, unique (bucket_id, name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    create policy broad_fixture_storage_grant on storage.objects for all to anon, authenticated using (true) with check (true);
    create table public.profiles (id uuid primary key, display_name text);
    insert into public.profiles values ('00000000-0000-4000-8000-000000000001', 'Main only');
    grant select, update on public.profiles to authenticated;
  `);
  for (const migration of migrations) {
    await db.exec(await readFile("supabase/migrations/" + migration + ".sql", "utf8"));
  }
}

const directoryId = (n) => "00000008-0000-4000-8000-0000000000" + String(n).padStart(2, "0");

async function seedDirectory(db) {
  await db.exec(`
    insert into auth.users (id)
      select ('00000007-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid from generate_series(1, 17) n;
    insert into plus_one.team_member_applications
      (applicant_id, display_name, area, languages, introduction, activities, adult_attested, status)
    select id, 'Private applicant details', 'Mumbai', 'English', 'Private intake field', 'Coffee', true,
      case when right(id::text, 2) = '14' then 'pending' else 'approved' end
    from auth.users where id::text like '00000007-%';
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

test("Plus One login accepts known local paths and rejects external or encoded targets", () => {
  assert.equal(plusOneReturnPath("/plus-one/admin/applications/" + recordId), "/plus-one/admin/applications/" + recordId);
  for (const path of ["https://example.invalid/plus-one", "//example.invalid/plus-one", "/plus-one//example.invalid", "/plus-one/%2e%2e", "/plus-one/unknown", "/plus-one\\apply", "/plus-one\n", "/plus-one?token=secret"]) {
    assert.equal(plusOneReturnPath(path), "/plus-one");
  }
  const login = szocialLoginUrl("https://szocial.example", "/plus-one/bookings");
  assert.equal(login.pathname, "/login");
  assert.equal(login.searchParams.get("returnTo"), "/plus-one/bookings");
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
  assert.deepEqual(readReviewDecision(form), { reason: "Test reason", decision: "declined", eligibilityVerified: false });
  form.set("decision", "approved");
  form.set("eligibilityVerified", "yes");
  assert.deepEqual(readReviewDecision(form), { reason: "Test reason", decision: "approved", eligibilityVerified: true });
});

test("production application submission and review work with synthetic local sessions", async (t) => {
  const db = await PGlite.create();
  await prepareDatabase(db);
  await db.query("insert into auth.users select unnest($1::uuid[])", [[applicant, reviewer, resident, inactive]]);
  await db.query("insert into plus_one.staff_roles (user_id, role) values ($1, 'reviewer')", [reviewer]);
  await seedDirectory(db);
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
    alter role plus_one_runtime login;
    set session authorization plus_one_runtime;
  `);
  const databaseReservation = createServer();
  const databasePort = await listen(databaseReservation);
  await new Promise((resolve) => databaseReservation.close(resolve));
  const database = new PGLiteSocketServer({ db, host: "127.0.0.1", port: databasePort, maxConnections: 4 });
  await database.start();

  const fixture = createSupabaseFixture(await readFile("public/dashboard/mumbai-cafe-640.webp"));
  const supabasePort = await listen(fixture.server);
  t.after(() => new Promise((resolve) => fixture.server.close(resolve)));
  const reservation = createServer();
  const port = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));

  const origin = "http://127.0.0.1:" + port;
  const base = origin + "/plus-one";
  const next = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], {
    stdio: "inherit",
    env: {
      ...process.env, NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:" + supabasePort,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable",
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
  assert.ok(fixture.requests.includes("/auth/v1/token"));
  assert.ok(!fixture.requests.some((path) => path.startsWith("/rest/v1/")));
  await applicantPage.goto(base + "/dashboard");
  const approvedPanel = applicantPage.getByRole("region", { name: "Team membership" });
  await approvedPanel.getByText("Approved", { exact: true }).waitFor();
  assert.equal(await approvedPanel.getByText(reason, { exact: true }).count(), 0);
  await approvedPanel.getByRole("link", { name: "Continue team setup" }).click();
  await heading(applicantPage, "Your application is approved");

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
});
