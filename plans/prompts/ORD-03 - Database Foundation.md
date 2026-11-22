# ORD-03 — Database foundation

**Priority** Must Fix  
**Source** Order 03 in the [master checklist](https://drive.google.com/open?id=1g_8ttQU772STbGoqJYybPJ4OWsETOUUw). Order 02 is deferred per the owner's instruction.

## Implementation prompt

Write the Plus One database foundation as standalone SQL for later application. Reuse the existing Szocial profile UUID and active-account check. Add per-account starter completion, trusted staff role assignments, explicit grants, row-level security, and a transaction-scoped test fixture. Keep feature-specific tables with the orders that introduce those features.

**Dependencies** The [Szocial identity migration](https://github.com/vishv-tech/Szocial/blob/1c34f03c11cf992d97a1c7008e6a22d336211859/supabase/migrations/20261024110413_core.sql), a PostgreSQL schema with the Supabase roles, and an authorized isolated database for later runtime verification.

**Acceptance criteria**

- The migration requires the upstream identity contract before it creates any Plus One table.
- A verified, active account can read and record its own starter completion.
- Anonymous, inactive, and unrelated accounts cannot read or change protected records.
- An active reviewer or operations account can read its own assignment. Only the privileged server role can grant or revoke assignments.
- The test fixture asserts ownership, staff permissions, and blocked access, then rolls back.

## Implementation plan

1. Generate a versioned migration file with the Supabase CLI's local `migration new` command.
2. Add the preflight, prefixed tables, and least-privilege grants. Reuse `private.active_user()` and the verified `auth.uid()` rather than creating a second identity system.
3. Add the isolated SQL test fixture and run static syntax checks. Record runtime verification as deferred until the owner provides access.

[Supabase migrations](https://supabase.com/docs/reference/cli/supabase-migration-new) · [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Changes and verification

**Result** SQL drafted and statically verified. Database verification is deferred until authorized access is available.

- Added `supabase/migrations/20261120073418_plus_one_foundation.sql`. It checks for the upstream identity contract, creates `public.plus_one_account_settings` and `public.plus_one_staff_roles`, and applies explicit grants and row-level security. Starter completion is a server-timestamped, owner-only record. Staff assignments use separate reviewer and operations roles.
- Added `tests/database/ord03_foundation.sql`. It uses six synthetic users and covers idempotent starter completion, cross-account access, anonymous and inactive sessions, and staff assignment and revocation. It requires explicit opt-in in an isolated session and rolls back its fixtures.
- `npx --offline --yes supabase@3.2.0 migration new plus_one_foundation --agent no` generated the local migration file. The WebAssembly PostgreSQL parser `libpg-query@18.2.4` parsed 13 SQL statements and one PL/pgSQL block in the migration, and 35 SQL statements and eight PL/pgSQL blocks in the test fixture. Static parsing does not verify database permissions at runtime.
- Database apply and runtime checks are pending. The Order 03 report stays local until the database acceptance checks can be run. Order 02 remains deferred as requested.

After access is provided, verify that the supplied database is isolated and has the Szocial identity baseline. Apply the versioned Plus One migration in that database, then run the fixture against the same isolated database:

```powershell
psql $env:PLUS_ONE_ISOLATED_DB_URL -X -v ON_ERROR_STOP=1 -c "SET plus_one.isolated_test = 'yes'" -f tests/database/ord03_foundation.sql
```
