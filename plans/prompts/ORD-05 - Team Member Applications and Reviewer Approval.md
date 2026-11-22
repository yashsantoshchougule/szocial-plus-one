# ORD-05 — Team member applications and reviewer approval

**Priority** Must Fix  
**Source** Order 05 in the [master checklist](../plans/prompts/00%20-%20Source%20Orders.md). [Application and reviewer outlines](../plans/06%20-%20Application%2C%20Team%20Member%20and%20Reviewer%20Screens.md)

## Implementation prompt

Create the Plus One team-member application, private status page, reviewer queue, and decision page. Accept a signed-in resident's display name, general area, languages, introduction, preferred activities, and adult eligibility attestation. A retry must keep entered values. A repeated submission must show the existing application. Only a trusted reviewer can decide a pending application. Keep the review reason private and enforce approval before the team setup entry.

**Dependencies** The existing Supabase SDK, a verified Szocial session, the Order 03 identity and staff role migration, and the Order 05 SQL. Website work and synthetic tests can proceed locally. Hosting, shared sign-in changes and applying SQL remain deferred.

**Acceptance criteria**

- A verified, active resident can submit once and see only their own status.
- Only an active reviewer can read the private queue or record a decision. An approval requires verified eligibility, and a reviewer cannot decide their own application. The database records the decision and private reason atomically.
- Only an approved account reaches team setup. Profile editing, publication, directory inclusion, and bookings belong to later orders.
- Run the existing build and browser suite plus focused tests for validation, access states, and the synthetic submission/review flow. Prepare isolated SQL checks for ownership and atomic decisions. Runtime database evidence remains separate.

## Implementation plan

1. Add a versioned SQL migration for applications and private reviews. Use explicit column grants, row-level security, a unique applicant, and one transactional review function.
2. Add the scoped server session adapter and form validation. Use the existing Szocial account ID and Order 03 reviewer role. Use the publishable key with verified session credentials.
3. Add the four requested pages, accessible form feedback, order-specific navigation, and the server-side approval gate. Reuse the responsive shell and state panels.
4. Verify locally with synthetic sessions. Add the database fixture and run syntax checks. Record actual outcomes in this file and leave Drive publication pending until the database acceptance checks can run.

[Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) · [Next.js forms](https://nextjs.org/docs/app/guides/forms)

## Changes and verification

**Status** Blocked on database integration. Website implementation and local verification passed.

### Website changes

- The starter and Discover link to `/plus-one/apply`. A returning applicant reaches `/plus-one/application`, where they can see their own pending, approved, or declined status. Failed submissions keep the entered fields and the adult attestation.
- Active reviewers use `/plus-one/admin/applications` and its detail pages. The queue has name search, pending and reviewed views, and a 20-row page size. A review requires a private reason. Approval also requires the reviewer to confirm adult eligibility and identity.
- The `/plus-one/team/setup` entry checks the latest application status on the server. Approved applicants can enter. Pending and declined applicants return to their private status page. This order implements the gate. The profile editor is part of Order 06.
- The [migration](../supabase/migrations/20261120081219_plus_one_applications.sql) defines protected application and review records, unique submissions per applicant, and a single transaction for each decision and its audit record. The [rollback-only SQL fixture](../tests/database/ord05_applications.sql) covers ownership, reviewer permissions, eligibility, repeat decisions, and private review notes.

### Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. Next.js reports the protected pages as dynamically rendered. |
| `npm run test:browser` | 6 passed. Chrome exercised the production website at phone and laptop widths with an in-process HTTP fixture bound to loopback. Coverage includes signed-out and inactive accounts, retry with values retained, duplicate submission, applicant privacy, reviewer-only access, name search, approval and decline, and the setup gate. Existing starter and navigation checks also passed. |
| PostgreSQL grammar check with `libpg-query@18.2.4` | Passed. Parsed 17 SQL statements and one PL/pgSQL block in the migration, and 23 SQL statements and five PL/pgSQL blocks in the fixture. |

The first browser runs exposed build-time configuration folding and a form reset that cleared the eligibility checkbox after a failed submission. Moved protected routes to request-time configuration and kept form values during retry, then reran the checks successfully.

### Pending

No database connection was made and no SQL was applied. Live Szocial sign-in, migration execution, PostgreSQL access policies, and transaction behavior still require verification in an authorized environment. Run the rollback-only fixture against an isolated database after the Szocial identity and Plus One migrations are in place. Drive upload is pending that verification.

