# Data Model and Access Rules

**Task PO-07 · Must Fix · Planned**  
Depends on PO-03 identity and PO-04 state model. Output: ordered database migrations, access matrix, and isolation tests.

## Logical records

Use existing Szocial account UUIDs. Namespace Plus One tables and functions in the shared project. Apply foreign keys, unique identifiers and status constraints where the database can enforce a business invariant.

| Records | Required fields and invariants |
|---|---|
| Account settings | Account ID, starter walkthrough completion, adult eligibility confirmation and policy version. Own account access. |
| Applications and decisions | Applicant, submitted fields, status and timestamps. One current application per account. Decision actor, outcome, and private reason are audited. |
| Team profiles and posts | Team account, listing fields, general area, city/timezone, rate in paise, eligibility and publication state. Post owns its photo reference, caption and publish time. |
| Availability windows | Team account, UTC start and end and display timezone context. Own schedule reads and writes. Public picker receives derived eligible times and blocked labels. |
| Bookings and quotes | Customer, team member, purpose, interval, hold expiry, rate snapshot, duration, total and currency, state and timestamps. Unique customer request key and enforced active interval exclusion. |
| Orders, captures, refunds and provider events | Booking and attempt IDs, provider references, expected amount/currency, actual transitions and event ID. Uniqueness prevents repeated finalization. Keep refund amount, reason, provider outcome and case link. |
| Conversations and messages | Unique conversation for the paid booking, participants derived from the booking, message sender, content, creation time and client send ID. Unique send key per sender and thread. |
| Participant settings and moderation | Viewer-specific message visibility, directional restriction and block, reports, case membership, and audit events. Store reasons and evidence against case IDs. |

Use bounded, cursor-based directory, booking, queue and chat reads with supporting indexes. Store money in integer paise and time ranges in timezone-aware UTC. Ensure only approved and published media can appear on eligible listings. Keep general availability separate from bookings, with private customer and purpose fields.

## Access matrix

| Surface | Resident | Applicant or assigned participant | Reviewer or operations |
|---|---|---|---|
| Directory, published profile and public fields | Active accounts can read eligible listings | Team owners edit their own eligible profile | Operations can audit listing eligibility |
| Application and decision | Submit under own ID | Applicant can read their own submitted fields and applicant-facing outcome | Reviewer checks and records decisions. Private review notes remain private. |
| Windows and times | Derived availability for eligible listings | Team member manages their own published windows | Operational access through authorized cases |
| Booking and payment status | Start own booking on eligible window | Booker and assigned team read their permitted fields. Only verified server or provider flows change money state. | Operations reads and acts on authorized cases |
| Thread, messages and Realtime | No general access | Only the booking participants. Sending requires a currently eligible conversation. | Review only reported or otherwise authorized case evidence |
| Message hides, restrict and blocks | Own preferences on relevant account or thread | A hide affects only its viewer. A block affects pair eligibility. | Case-bound moderation and audit access |

Enable row-level security for exposed tables and explicitly grant only roles that need access. Use row predicates and include write-side checks. Separate reviewer and operations privileges. Authorize booking and message writes from the verified session. Keep privileged roles and service-side credentials outside client bundles. Align Realtime policies with the same membership and visibility rules. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Migration and API task

1. Add Plus One schema after the required Szocial Auth and profile baseline. Register a repeatable migration order and an isolated test fixture with unauthenticated, customer, different customer, approved member, reviewer and operations accounts.
2. Add read contracts for eligible directory, profile, derived availability, booking status and history, and cursor-based chat. Return a safe unavailable result for unauthorized identifier reads. Enforce page limits and apply role checks within writes and database policies.
3. Add transaction-backed commands for application review, listing publication, quoted hold, confirmation, cancellation, and chat operations. Payment and refund operations use restricted server or signed webhook entry points. Keep external provider calls outside database transactions.
4. Protect uploaded bytes and object references. Validate and re-encode supported photos and expose private media through authorized short-lived URLs. Verify that pending profile media and removed photos cannot be retrieved by unrelated accounts. Because signed URLs remain valid until expiry, keep expiry short and document the immediate revocation requirements for sensitive content.
5. Prove migration and compatibility with isolated checks. Existing Szocial identities and billing remain readable and perform their baseline flows. Use feature disablement and forward corrective migrations to handle production rollback.

**Acceptance:** access tests cover direct reads, writes, media requests, and Realtime for wrong accounts. Database checks reject a duplicate application, concurrent overlapping reservations, duplicate payment finalization and duplicate conversation creation.

[Supabase Data API permissions](https://supabase.com/docs/guides/api/securing-your-api) · [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [PostgreSQL range types](https://www.postgresql.org/docs/current/rangetypes.html)
