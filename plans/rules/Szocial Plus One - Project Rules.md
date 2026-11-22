# Szocial Plus One — Project Rules

Apply these rules when planning, implementing, testing, or releasing Szocial Plus One. The [product brief](../Szocial-Plus-One-Product-Brief.md) defines product requirements. The [roadmap](../00%20-%20Project%20Index%20and%20Roadmap.md) links the task plans and records the proposed pilot defaults. Product and operations approve changes that affect prices, participant eligibility, refunds, compensation, moderation, or retention before live use.

## 1. Repositories and naming

- Keep Plus One functionality in the separate Szocial Plus One repository. Szocial owns resident sign-in, identity, and the Home entry link. Keep the customer-facing route under `/plus-one` once shared-origin routing passes staging verification.
- Use the planned Next.js App Router structure. Put routes in `app/`, business rules in `features/`, common UI in `components/`, server-only integrations in `lib/`, versioned SQL in `supabase/migrations/`, and checks in `tests/`. Keep dependency versions reproducible through the lockfile.
- Use lowercase feature folder names and hyphens when a name contains several words. Follow the framework's file conventions for routes. Name components for the screen or control they render, and tests for the behavior they verify.
- In Drive, use **Szocial Plus One** as the root folder and **rules** for project rules. Keep the original brief under its original filename. Use numbered, descriptive filenames for plan documents and keep their PO IDs stable. Use the index to link the current copy.

## 2. Identity, roles and privacy

- Use the same verified Szocial account ID across both apps. Check active account status and role on the server. Browser storage and user-editable claims have no authority to grant access.
- Preserve the requested Plus One path through Szocial login only after validating it as an allowed internal destination. Keep session tokens and secrets out of URLs, client bundles, documents, and logs. Verify expiry, shared sign-out, and isolated staging configuration.
- Restrict application and review records to the applicant and authorized reviewers, with separate access to private decision notes. Let only approved users register as team members. Require a complete, published, booking-enabled profile before directory or booking access.
- Enforce permissions at the route, write, database, media, and Realtime boundaries. Expose only general location and derived availability publicly within the signed-in directory. Keep customer identity, meetup purpose, payment records, and exact meetup plans within their authorized contexts.

## 3. Booking and money

- Treat availability as a property of the full appointment interval. Check published hours, blocked periods, buffer, eligibility, and current schedule before creating a hold. Protect overlaps with the database and serialize conflicting booking and schedule operations.
- Calculate the quote on the server in integer paise. Snapshot the rate, duration, and total. Store timezone-aware timestamps and display Mumbai pilot appointments in IST. Distinguish Available, Currently busy, Unavailable, Already booked, and Temporarily held in text.
- Confirm a booking only after server verification of a matching captured payment. Check provider order, payment reference, currency, and amount. Verify signed events against the raw body. Handle replay and out-of-order delivery without duplicating transitions, conversations, or refund requests.
- Route expired or cancelled holds that later receive a charge to operations for reconciliation and refund. Keep a traceable history of the booking, payment, case and provider refund. Use Razorpay test mode until checkout, exceptions, and merchant readiness pass the release gate.

## 4. Chat, safety and support

- Create exactly one conversation per confirmed paid booking, including advance bookings. Keep messages visible to the two participants under the approved history policy. Verify sender and recipient permissions on every access path.
- Save Delete for me as the acting user's visibility setting. Keep Restrict private and reversible. Apply Block to pair messaging and new bookings. Offer a support route for affected paid bookings and have operations handle cancellation or refunds.
- Provide a Report route and audit approved case access. Keep case evidence and chat content out of ordinary analytics. Show public first-meeting guidance and approve data-retention, eligibility, and escalation procedures before taking live bookings.

## 5. Screen and accessibility rules

- Design mobile first. Verify key flows at 320, 390, 768, 1280, and 1440 px. Use a single focusable link for each directory card, text labels for status, visible keyboard focus, and accessible error and confirmation feedback.
- Give every page a clear next action. Specify applicable loading, empty, conflict, permission, and retry states. Preserve valid form inputs when reselecting a slot or recovering from a failure. Keep booking actions and the chat composer clear of mobile safe areas and the keyboard.
- Keep profile photos prominent and the interface visually distinct. Use references for patterns and use approved project imagery in the product.

## 6. Work one task at a time

1. Read the latest authorized brief and the applicable PO plan. Start with Must Fix work in dependency order. Record the task ID, expected behavior, affected entry points, and the smallest meaningful baseline.
2. Inspect callers and upstream contracts before changing shared behavior. Verify assumptions with repository source and primary documentation. Keep the implementation within the task and preserve user work.
3. Write or update the task plan before coding. Include affected paths, steps, tests, dependencies, and a recovery path for stateful changes. If a dependency blocks completion, record what is missing and continue independent tasks.
4. Check the normal entry point and relevant negative paths. Run lint, type checks, the production build, and the focused tests for the change. Verify auth and permissions with separate synthetic accounts, booking races on isolated PostgreSQL, and payment reconciliation in test mode.
5. Save actual test evidence and link the corresponding Drive report. Record **Planned**, **Blocked**, or **Resolved** according to the evidence. A plan or a passing check on another branch is insufficient to close the current task.

## 7. Live release and rollback

- Keep staging and pilot credentials and data separate. Confirm payment-provider readiness, operations ownership, screening and customer disclosures before opening live checkout. Get explicit project authorization before deploying, pushing implementation changes, or running production migrations.
- During the pilot, monitor account access, slot conflicts, unmatched captures, refund aging, booking-to-chat completion, and open cases. The pilot owner signs off on the release checks in PO-10.
- If the pilot needs a rollback, disable new reservations and checkout. Preserve existing booking access, support, and payment/refund reconciliation. Keep an audit trail and verify the affected workflow before reopening.
