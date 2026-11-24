# ORD-02 — Shared Szocial sign-in and private database schema

## Current requirement — share sign-in only

This replaces the earlier same-project data design recorded below. Main Szocial owns login, sessions, and account status. Plus One verifies the Main session on the server and uses the verified user UUID as its account reference. Main business profiles, application data, and credentials for its database or Storage are outside the Plus One boundary. There is no second sign-in.

Plus One uses a separate Supabase project with its own PostgreSQL database, private Storage, runtime credentials, and roles. That project owns applications, reviewers, profiles, posts, media, availability, bookings, payments, chat, and support. Same-origin routing under `/plus-one` and allowlisted login return paths remain part of the entry flow.

1. Split the Main Auth and Plus One data configuration explicitly. Keep the Main SSR client limited to sign-in/session verification. Use Plus One credentials for every database and Storage operation. For protected media, verify the Main session and Plus One eligibility on the server before reading from Plus One Storage.
2. Replace Plus One foreign keys into `auth.users` with local identity references. Bind those IDs through the already verified Main session, without copying passwords, tokens, contact details, or Main business profiles. Keep Plus One roles local. If needed, consume Main account eligibility through the Auth contract. Agree on account deletion and retention behavior before replacing the existing same-database cascades.
3. Inspect migration history in an authorized target before applying SQL. Use a clean split baseline for a new Plus One database. If earlier Plus One data already exists elsewhere, reconcile and move only its records and files via a separately reviewed migration.
4. Verify with separate Auth and data endpoints and credentials. Check one-click entry, profile deep links, refresh, sign-out, and disabled access. Prove that Plus One can work with no credentials for Main business data and that a Main session cannot read Plus One data or Storage directly. Rerun application, profile publishing and protected media checks after the split.

**Status** The split is implemented and verified locally. Staging still requires two authorized Supabase projects and the shared entry on Main Szocial. The earlier verification below applies to the same-project prototype.

The new migration `20261123100000_plus_one_separate_data_project.sql` keeps the existing user UUIDs and foreign keys between Plus One records. It removes cross-service references to local Auth user rows and denies direct browser access to the two private media buckets. Plus One verifies each post-photo request before reading it with its own server key. Cover URLs are signed in batches from Plus One Storage after the directory eligibility query. The runtime validates that its database connection and Storage URL point to the Plus One project and that this project differs from Main Auth.

Lint, typecheck, the production build, and all 15 local checks passed. Chrome used distinct loopback Auth and Storage services plus an isolated PostgreSQL database with no local Auth users. The suite covered session refresh, login return paths, disabled and signed-out access, application review, directory covers, two-photo publishing and reading, and denial of direct Storage access with a Main session. Main Auth received only Auth requests. The separate media service accepted the Plus One server key only, apart from the previously issued signed cover requests.

Before opening the Main entry in staging, apply the migrations to the Plus One project, set the matching [configuration](../../README.md#shared-szocial-integration), and rerun the two-project boundary checks with real staging accounts. If the cutover fails, disable the Plus One entry while the configuration is fixed. Keep existing records and Storage files in place so the cutover can be retried.

[Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) · [Supabase private Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals) · [PostgreSQL schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)

## Baseline

Main Szocial checkout `C:/yash/projects/zsocial` is on `main` at `cc0cd335b21641806e3b82621878ca79d2814133`. Resident login sets browser-local state and has no verified Supabase session to share. The separate Auth branch at `1c34f03c11cf992d97a1c7008e6a22d336211859` has root-scoped Supabase SSR cookies, password and PKCE authentication, server user checks, refresh in middleware, and logout via its Auth endpoint. Its login destination currently returns Home, business dashboard, or onboarding. Its Next config has no Plus One forwarding. The authorized implementation directory is the Plus One repository.

Plus One has a draft Order 03/05 database design that depends on Main's profile table and is exposed through the Data API. No earlier order recorded applying those SQL files. The updated architecture uses the private schema and Supabase Auth UUIDs only. The connected Supabase project returned no development branches. The provided settings identify the existing project. They do not provide a dedicated database-role connection string. This order is limited to local verification.

## Plan and acceptance

1. Reuse the verified Supabase SSR identity on Plus One. Add same-origin login redirects with known Plus One paths, renew shared cookies, and prevent shared caching. Keep the standalone preview usable when an integration origin is absent. Every private screen and write continues to require a verified server-side user.
2. Update the draft Plus One foundation and application migrations to establish the private `plus_one` schema. Keep existing Main objects and grants untouched. Scope the server's runtime role to Plus One. Add a preflight for effective grants and keep its sign-in credential out of migrations. Check whether any SQL drafts were independently applied before staging. If so, prepare a forward migration for those Plus One records before enabling the new connection.
3. Move the already built application, review, and dashboard status reads and writes to authorized, parameterized server queries. Preserve applicant status, duplicate suppression, and reviewer privacy.
4. Run the application flows and test refresh, missing session, protected requests, and safe login targets. Exercise the schema and grants in an isolated PostgreSQL runtime, with a representative separate Main schema. Real Main sign-in, cross-website logout, routing, and staging grant verification remain release gates. Stop at this order if they are unavailable.

[Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) · [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) · [PostgreSQL privileges](https://www.postgresql.org/docs/current/ddl-priv.html)

## Verification

**Status** Blocked on Main Szocial integration and staging verification. The Plus One implementation passes local testing.

### Implemented in Plus One

- A configured Main Szocial origin enables the shared Supabase session boundary, cookie refresh, and login redirects for allowlisted `/plus-one` paths. The starter, dashboard, application screens, and reviewer actions keep their existing URLs. Signed-out mutations are rejected, and session-sensitive responses use private, no-store caching.
- Plus One business records use the private `plus_one` schema with foreign keys to Supabase Auth UUIDs. Application status, submissions, and reviews use server-only PostgreSQL queries with an explicit per-transaction actor. The runtime role has no reviewer assignment privileges. Duplicate submissions and atomic reviewer decisions still work. No application code reads or copies Main business profiles.
- The foundation checks for existing privileges that would cross the application boundary and fails without widening or revoking Main grants. It also stops if it finds draft public Plus One tables. If the old draft versions are already applied in an environment, review a forward migration before switching the code there.
- The server accepts a dedicated `PLUS_ONE_DATABASE_URL`. The migration creates `plus_one_runtime` without a login password, and a staging owner must provision its login separately after the grant check. The project settings supplied do not include a PostgreSQL connection for that role. Hosted connection settings and secret values were never stored in project files.

### Verification

| Command or check | Result |
| --- | --- |
| `npm run lint`, `npm run typecheck`, `npm run build` | Passed in Plus One. The integration environment variables were empty for the production build. |
| `npm run test:browser` | 9 passed. The production browser suite used a loopback Auth fixture and isolated PostgreSQL via PGlite. It tested first visits, protected direct links, expired-cookie refresh, cookie removal, cache headers, applicant privacy, approval, decline, and reviewer permissions. |
| `tests/database/ord03_foundation.sql` and `tests/database/ord05_applications.sql` | Passed inside the same isolated suite. The runtime could neither read nor update the fixture Main profile table. Browser database roles could not read the private schema. The Main fixture row and its authenticated grant were preserved. |
| `node --test tests/auth.test.cjs` on the archived Main Auth branch | 20 passed. |
| `node tests/auth-browser.cjs` on the archived Main Auth branch | Passed using synthetic Auth. The disposable test copy used a Windows-compatible log path and the installed Chrome executable. The original Main checkout was read only. |

### Remaining gates

Main `main` still needs the reviewed Auth implementation, a signed-in Home link, same-origin forwarding for `/plus-one` and descendants, and login handling that revalidates `returnTo` before redirecting after authentication. Apply the Plus One SQL in an approved isolated environment after checking its migration history, effective grants, and whether the schema is omitted from the Data API. Then prove that both websites resolve the same real Auth UUID, including refresh, direct links, and Main sign-out.

Automatic approval review rejected the requested read-only metadata check against the existing local integration database because it fell outside the prior code-and-fixtures-only database boundary. No SQL was executed on that database or on the hosted project. No live migration, source push, or Drive upload occurred. The report is local until the remaining gates pass.

