# Availability, Booking and Payments

**Task PO-08 · Must Fix · Planned**  
Depends on PO-05 and PO-06 screens, PO-07 data rules, and a Razorpay test account. Output: bookable schedules, transaction-safe reservation and checkout, and refund reconciliation.

## Pilot rules for product approval

- Mumbai, Asia/Kolkata. Publish explicit availability windows. Use a 30-day search horizon, two-hour minimum notice, 60-minute minimum, 30-minute increments, four-hour maximum, and a 30-minute buffer between appointments.
- Instant booking within published windows. Operations sets each hourly rate in rupees. Store service price in paise and round the exact hourly-rate × minutes calculation once to the nearest paise. Show the rate, duration, and final amount upfront. Example: ₹600/hour × 90 minutes = ₹900.
- The full appointment must fit an open window. Enforce the buffer between appointments whether the starts fall in the same published window or separate windows. Model occupied time with half-open ranges. Distinguish Currently busy, Already booked, Temporarily held, Unavailable and Available without exposing customer identity or purpose.
- Pilot checkout uses a 10-minute hold. Customer cancellation at least 24 hours ahead and team/Szocial cancellation qualify for full refunds under the proposed policy. Later customer cancellations, no-shows and safety cases go through operations. Support handles rescheduling as cancellation and rebooking. Operations owns team-member compensation under signed-off terms.

## Hold, order and verification workflow

1. Read availability with team member, selected local date and duration. The server validates the whole interval, schedule, role, block status and rate, then returns a quote and the selectable start times. Booking creation accepts the customer's request ID, member, start, duration, purpose and expected quote. A changed price or unavailable time prompts fresh confirmation.
2. Acquire the team member's transaction lock. Expire stale holds, recheck the window and eligibility, and create an exclusive hold with a stored price snapshot. Enforce active hold and confirmed overlap with a range exclusion constraint. Use the same lock for conflicting schedule edits and payment finalization.
3. Reserve one order record per checkout attempt. Create the Razorpay INR order for the stored paise amount and persist the matched provider reference. Reuse the attempt on a duplicate client request. If the provider call times out after a possible side effect, reconcile before issuing a replaced order. Show the true expiry and handle customer cancellation or abandonment.
4. The browser return or polling requests payment status. Validate returned payment references against the stored order and verify capture with the provider. The webhook verifies the raw-body signature, deduplicates by provider event ID and calls the same reconciliation path. Match order, payment, amount and currency before changing booking state.
5. In one database transaction, confirm a valid live hold and create the one booking conversation. Show Open Chat on confirmed payment. Process repeats idempotently. If the capture is reconciled after expiry or cancellation, keep the booking closed, prevent chat creation, record the captured funds and open an exact-payment refund case.
6. Track cancelled bookings, refund pending, refunded and failed refunds. A retry uses the same refund request identity and reconciles provider state. Save financial audit references and use a protected operations action for overrides and outstanding reconciliation. Keep ordinary operational logs free of payment instruments and meetup purpose.

## Integration boundaries

| Entry | Contract |
|---|---|
| Availability and quote | Date, duration, member, optional selected start → allowed starts, slot reasons, server pricing. |
| Place checkout | Authorized actor and expected quote → booking, hold expiry and provider checkout details, or slot/quote error. |
| Reconcile and status | Signed provider event or authorized booking status request → durable provider and booking outcomes. |
| Cancellation and refund | Authorized support request or operations action → case, outcome and stable provider refund reference. |

## Verification

- Simulate opposing concurrent checkouts and a schedule update during checkout on isolated PostgreSQL. Exactly one overlap can win. Include a 4–6 p.m. booked range, a rejected 3–5 p.m. request, and 6:30 p.m. as the first possible buffered start when its window allows.
- Run pricing fixtures for 60, 90, and 240 minutes, a changed rate, out-of-window times, past dates, expired holds, and wrong-actor replay. Check that no client payload can set the payable amount.
- In Razorpay test mode, run successful, abandoned and failed payments, duplicated callbacks, reordered and delayed webhooks, wrong amount and order, and a late-refund path. Confirm payment status reloads correctly and only a confirmed booking grants chat. Exercise refund retry and audit status.

**Acceptance:** no double-booking, duplicate charge workflow, duplicate refund, or duplicate conversation under tested retries. Users can recover from stale or expired checkout without losing access to status and support. Operations can reconcile every captured payment with an appointment or refund case.

[PostgreSQL range constraints](https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT) · [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) · [Webhook validation](https://razorpay.com/docs/webhooks/validate-test) · [Refund APIs](https://razorpay.com/docs/api/refunds)
