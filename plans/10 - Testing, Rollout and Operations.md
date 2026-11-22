# Testing, Rollout and Operations

**Task PO-10 · Must Fix · Planned**  
Depends on PO-01 through PO-09 and the scalability evidence in PO-11. Owners: QA, product owner, Szocial and Plus One engineering and pilot operations.

## Acceptance checklist

Use an isolated staging host and Supabase project, Razorpay test mode, six synthetic accounts, and fixtures for open, busy, paused, pending and declined listings. Check the actual PostgreSQL and browser flow under normal entries. Capture command, revision, environment, expected/actual result, and a sanitized screenshot or log for each check.

| ID | Pass condition | Method |
|---|---|---|
| QA-01 | Signed-in Szocial resident enters Plus One in one click. Signed-out deep link returns after approved login. Refresh, sign-out and disabled accounts behave consistently. | Browser against both staging apps and real isolated Auth. Exercise normal Szocial routes after enabling the mount. |
| QA-02 | Whole directory card opens the correct approved profile and photo grid. Profile shows locked Chat before payment. Paused/unpublished profiles cannot be booked directly. | Browser at phone and desktop sizes, plus DB/API directory and media checks. |
| QA-03 | Purpose, duration, selectable date/time and INR total are correct. 90 minutes × ₹600/hour yields ₹900. A changed quote asks the user to review the new total. | Unit pricing fixtures and browser booking flow. |
| QA-04 | Busy and booked periods reject overlap while eligible future starts remain available. Lead time, horizon and buffer hold at boundaries. | Database fixtures and calendar browser checks. |
| QA-05 | Two checkout requests for overlapping times cannot both take the slot. Stale holds release availability. A racing schedule edit cannot invalidate a live booking. | Parallel transactions in isolated PostgreSQL. |
| QA-06 | Verified capture confirms once and opens a single private thread. Failure, duplicate, delayed and mismatched events behave as PO-08 specifies. Late charges and cancellation refunds remain traceable. | Razorpay test mode, signed test events, booking status and retry checks. |
| QA-07 | A paid advance booking unlocks chat for both participants. Unrelated users cannot query, send or subscribe. History and per-user deletion persist across reload. | Three browser sessions plus DB and Realtime access probes. |
| QA-08 | Both parties can restrict, block, report and reach support, including while an appointment is paid. Case access is audited. | Paired account browser runs, case authorization, transaction checks. |
| QA-09 | Application is private. Only a reviewer can approve it. Approved team member can register and publish. Pending and declined applicants stay out of discovery and booking. | Customer, denied reviewer and authorized reviewer E2E plus RLS assertions. |
| QA-10 | Mobile pages and first-party operations meet the PO-11 speed budgets at the proposed peak. Burst traffic recovers, booking and payment invariants hold, and private data stays isolated. | Run the mobile checks and sustained, same-slot, reconnect, and recovery scenarios in the [Scalability and Performance plan](11%20-%20Scalability%20and%20Performance.md). Record the tested infrastructure and limits. |

## Commands and layout

- Szocial staging baseline: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:browser` on the integrated branch where those scripts are defined.
- Plus One CI targets after scaffold: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:db`, and `npm run test:e2e`. Keep database checks targeted to explicitly isolated fixtures. Set up the staging command paths in PO-01.
- Exercise 320, 390, 768, 1280 and 1440 px. Check Safari iOS and Chrome Android for hosted checkout, keyboard-safe chat, back navigation and scroll restoration. Check keyboard access, visible focus, accessible names, error announcements and reflow. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Rollout and recovery

1. **Staging gate.** Verify same-origin routing and auth refresh, all QA cases, environment separation, schema upgrade order, and named incident owners. Rehearse a failed capture, a late refund, and an active block without live data.
2. **Pilot gate.** Confirm screening, adult eligibility, safety policy, pricing and cancellation disclosures, provider merchant activation, refund responsibilities, approved privacy rules and compensation handling. Invite a limited Mumbai team-member cohort. Enable listing and customer entry for the pilot, then enable live checkout only after operations verifies readiness. [Razorpay live setup](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps)
3. **Monitoring.** Track shared sign-in failures, endpoint latency and errors under load, database and Realtime utilization, slot conflicts, stuck payment reconciliation, refund aging, booking-to-chat success and open cases. Page a named owner for captured payments without a confirmation or refund case and for any cross-account access incident. Reconcile captured orders daily during the pilot.
4. **Rollback.** Disable new reservations and live checkout while keeping existing booking history, chat where authorized, case access and payment/refund reconciliation available. Revert the affected application deployment or use an additive corrective migration. Preserve audit records and verify the affected flow before re-enabling checkout.

**Acceptance:** all ten checks have linked evidence and an owner. Engineering has recorded the tested sustained load and burst behavior. The operations owner has signed off on payment, schedule, safety and case recovery. Game-day rollback preserves existing paid customers' ability to reach support and view status.

Planning evidence covers the brief, repository source and primary references. All application and staging verification in this checklist is scheduled work.
