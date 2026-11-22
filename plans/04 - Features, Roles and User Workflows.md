# Features, Roles and User Workflows

**Task PO-04 · Must Fix · Planned**  
Source: the preserved product brief. Output: the common workflow and state contract for PO-05 through PO-10.

## Roles and authority

| Role | Main actions | Permission boundary |
|---|---|---|
| Resident | Discover, book, pay, view personal bookings, chat and apply | Active, verified Szocial account. Adult eligibility before booking and applying. |
| Applicant | Submit one application and read its status | Own application only. Approval enables registration. |
| Approved team member | Complete and publish a listing, manage posts and windows, see assigned bookings and chat | Approved account. Directory listing also requires complete profile, publication and acceptance of bookings. |
| Reviewer | Read applications and record a decision | Trusted review permission, limited to application work. |
| Operations | Manage booking exceptions, refunds, reports and team compensation | Trusted operations permission and an audit record for case access and changes. |

## Customer journey

1. Open Plus One from Szocial. First visit shows a short explanation of hourly platonic bookings and payment-gated chat. A returning resident opens the directory.
2. Browse approved profile cards by area or activity. A whole-card link opens a photo-first profile. It shows the hourly rate, general location, languages, interests, posts, and booking action. Chat is locked until a matching paid booking exists.
3. Enter purpose and duration. Choose a date and an available start. Review the quote, eligibility and cancellation terms. Pay using hosted Razorpay checkout.
4. Return to the booking status page. While the server confirms payment, show a processing state with a durable return path in My Bookings. A verified paid booking opens its private conversation, including advance bookings.
5. Agree on a public place inside the booking thread. Use support for cancellation or payment issues. Visit My Bookings for status, receipt reference, or prior chat.

## Team member and reviewer journey

1. A signed-in resident submits name, general area, languages, introduction, activity preferences and adult eligibility. The application moves from Draft to Pending review.
2. Reviewer checks the application and records Approved or Declined. Use a private decision reason and an audit event. A declined applicant retains resident access. During the pilot, operations may reopen a declined application through an audited action.
3. Approval unlocks the registration form. The member completes required profile details, uploads a photo, and publishes their listing with a rate maintained by operations. They add time windows and can pause new bookings.
4. Team members review assigned bookings, coordinate in matching threads, edit profiles and manage photo posts. Schedule edits preserve existing confirmed appointments. An operations case handles changes that affect an existing booking.

## State and exception contract

- **Applications:** Draft → Pending review → Approved or Declined. Approved → Registration required → Published when complete. Pause or unpublish removes discovery and new bookings. Existing booking and support access follows the booking's own state.
- **Availability:** Available, Currently busy, Unavailable, Already booked, or Temporarily held. Resolve status for the selected duration. If the selected time disappears, return to the same form with other available starts.
- **Booking and payment:** Held → Confirmed, Expired or Cancelled. Confirmed → Completed or Cancelled. Payment verification and refunds retain their own statuses. Expose one booking reference throughout recovery.
- **Chat:** Locked → Open on verified confirmation → Read-only after the sending window or booking cancellation. Restrict changes one participant's view and alerts. Block stops pair messaging and new bookings, and opens support where existing obligations are affected.
- **Support:** A report, cancellation request, payment exception, or affected active booking creates an access-controlled case. Operations records action, owner, status and resolution.

## Implementation task

1. Give each state a visible label and one clear next action. Map states to screen IDs in PO-05 and PO-06 and persisted transitions in PO-07.
2. Review end-to-end journeys with members of product, operations, design and engineering. Confirm what each role sees for declines, expired holds, delayed capture and active blocks.
3. Add journey coverage with one successful and one rejected or interrupted scenario for each role. Use the QA IDs in PO-10.

**Acceptance:** every confirmed requirement is represented in an actor journey and an authorized state transition. Payment, booking, review and moderation states stay independently traceable.
