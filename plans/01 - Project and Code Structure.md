# Project and Code Structure

**Task PO-01 · Must Fix · Planned**  
Depends on PO-02 for pinned tools. Coordinate the initial scaffold with PO-03. Output: two independently buildable applications and a single migration ownership convention.

## Repository boundaries

- **Szocial** owns account signup, verification, recovery, sign-out, identity and shared account roles. Add the Plus One entry to the signed-in resident Home content inside the existing resident shell. Maintain one clear mobile entry point. Configure the Szocial public host to route the Plus One namespace.
- **Szocial-Plus-One** owns booking journeys and policies. Use one Next.js App Router application with TypeScript and SQL migrations. Define its own semantic color variables and UI components, based on the existing brand. Centralize navigation paths and route guards so the two deployment origins can be tested consistently.
- One Supabase project per environment supplies the shared account ID. Szocial owns Auth and base account migrations. Plus One owns its own tables, policies and storage in the same environment. Keep a deployment migration manifest with the required Szocial baseline and applied Plus One versions. Verify both migration chains in order from a clean database and against an upgrade fixture.

## Proposed Plus One tree

```text
app/
  (customer)/       starter, directory, profiles, booking, history, chats
  (team)/           application and status, registration and team workspace
  (admin)/          reviewer queue and operations cases
  api/              session-backed status reads and Razorpay webhook
components/         app shell, cards, state panels, forms, dialogs
features/
  applications/     intake, review and team registration
  team/             directory, profile, posts and media
  bookings/         schedule, slot rules, quote, booking and status
  payments/         order, provider verification, reconciliation and refunds
  chat/             thread membership, message state and participant controls
  support/          reports and case handling
lib/                server-side connection and shared infrastructure
supabase/
  migrations/       Plus One schema and permission changes
tests/
  unit/             deterministic pricing, return path and state rules
  database/         isolated permission, integrity and concurrency checks
  e2e/              Playwright customer, team and reviewer journeys
docs/               engineering decisions and release evidence
```

Parenthesized folders are route groups. Next.js applies `basePath: '/plus-one'` to internal routes. The public page inventory and natural entry points are defined in PO-05 and PO-06. Use feature-level modules to hold business rules. Route files orchestrate page reads and calls. Server Components handle first loads and Client Components handle calendar interaction, upload progress, hosted checkout, and chat updates.

## Interfaces and growth

- The application boundary accepts typed, server-validated input. The database owns durable workflow transitions and invariants. Read payloads contain only the fields required by each screen. Shared rules such as approved listing eligibility should have one definition.
- Store city and timezone in the team/location data, with Mumbai and Asia/Kolkata as the pilot settings. Store payment references and compensation decisions against booking IDs so later financial workflows have a durable record.
- Keep the existing Szocial and Plus One billing records independently named. Keep separate webhook signing secrets and routing for the two products. Assign ordering and rollback ownership explicitly before staging migrations.
- Reuse the branch's established auth/config patterns after review. Reuse approved brand tokens and common interaction conventions. Extract shared packages when the two repositories have a proven reuse need.

## Implementation task

1. Set up App Router route groups, TS/ESLint, and a reproducible Node/npm toolchain in the Plus One repo.
2. Add the shell, base path, server configuration validation, empty route pages, and isolated Supabase setup. Document startup, environment variable names, migrations, and test commands in the repository.
3. Configure narrow CI commands for lint, types, build, unit and database checks. Add Playwright staging jobs as the normal journeys become available.
4. Validate the scaffold with `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`. Verify a deep route, prefixed assets, and a protected route through the public staging origin.

**Acceptance:** a developer can clone, install, build and run against isolated local services from the README. Existing Szocial routes and business billing pass their baseline checks. Migrations have an owner, ordering, and a safe retry path.

[Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure) · [Next.js base path](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) · [Szocial source tree](https://github.com/vishv-tech/Szocial/tree/cc0cd335b21641806e3b82621878ca79d2814133)
