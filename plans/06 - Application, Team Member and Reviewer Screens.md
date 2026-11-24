# Application, Team Member and Reviewer Screens

**Task PO-06 · Must Fix · Planned**  
Depends on PO-03, PO-04 and PO-07. Controls profile eligibility before PO-08 enables bookings. The phone and laptop patterns follow PO-05.

## Team member selection

An applicant signs in with their Szocial account and submits the Plus One application. The application stays **Pending review** while an authorized Plus One admin manually reviews the form and verifies the applicant's background. The admin records **Approved** or **Declined**. Approval requires a recorded confirmation that the manual review and background verification passed. Keep the decision, reviewer, timestamp, and private notes in Plus One. The applicant sees their status.

Only approved applicants can open Team profile setup or save a listing. Approval unlocks setup. A complete profile with a cover photo must be published separately before it can appear in Discover and accept bookings.

The reviewer flow records identity and adult eligibility separately from the manual form review and background confirmation. Both are required for approval in the server action and database. Before rollout, define what reviewers check and which evidence, if any, Plus One retains. The migration keeps prior decisions for audit, pauses legacy listings, and returns previous approvals without recorded background verification to review.

**Implementation and verification:** The approved member can save and edit a private draft, upload a cover to Plus One Storage, and publish once operations sets a rate. Pause removes the listing from Discover and resume restores it. Lint, typecheck, the production build, and all 17 local checks passed. The browser suite used separate Auth and Storage fixtures and isolated PostgreSQL on port 3001. It checked that the admin cannot approve without the manual confirmation, pending and declined applicants cannot enter setup, and a screened applicant can draft, upload, publish, edit, pause, and resume. The migration was tested against an earlier approval with its private audit record. Hosted rollout remains pending. [Operator steps](../README.md#review-applications-and-publish-team-profiles)

## Application and team profile

### T01 · Become a Team Member · `/plus-one/apply`

```text
PHONE                          LAPTOP
Become a Team Member           Become a Team Member
Who can apply                  Form                 | Review steps
Name · Area · Languages        Name · Area · Languages
Intro · Activities             Intro · Activities
[Adult eligibility]            [Adult eligibility]
[Submit application]           [Submit application]
```

Validate field errors near the input and keep answers through a retry. Submission uses the existing verified account. Duplicate submissions resolve to the existing status. Explain who can see application details. QA-09.

### T02 · Application status · `/plus-one/application`

```text
PHONE                          LAPTOP
Application status             Application status
Pending / Approved / Declined  Status and next action | Submitted summary
[Continue setup] if approved   [Continue setup] if approved
[Back to Discover]             [Back to Discover]
```

Pending shows that review is underway. Declined shows applicant-facing guidance where provided. Approved reveals Continue setup. Use the same screen for a retried submission and an applicant returning later. QA-09.

### T03 · Team registration · `/plus-one/team/setup`

```text
PHONE                          LAPTOP
Set up your team profile        Set up your team profile
Photo · Name · Area             Required fields        | Listing preview
Bio · Languages · Activities    Upload and disclosure  | Completeness
Rate and publishing status      [Save draft] [Publish]
[Save draft] [Publish]
```

The server checks approval on page load and each write. Reuse approved application fields as editable defaults. Show the operations-set rate and require a usable photo and required fields before publish. Publish allows discovery when accepting bookings is enabled. QA-02, QA-09.

### T04 · Profile and posts · `/plus-one/team/profile`

```text
PHONE                          LAPTOP
Team profile [Preview]          Profile editor        | Directory card
Edit details [Save]             Photo and bio         | Profile preview
Status [Pause bookings]         Publish controls      |
Photos [Add photo]              Photos and captions  | [Add photo]
[Photo] [Photo] [Photo]
```

Support add, edit caption, and remove media with retry and clear pending states. Validate and re-encode image uploads. Keep draft state and publishing controls distinct. Pausing blocks new checkouts while existing bookings remain accessible. QA-02, QA-09.

## Scheduling and team bookings

### T05 · Availability · `/plus-one/team/schedule`

```text
PHONE                          LAPTOP
Availability [Add window]       Availability [Add window]
[Day selector]                 Week calendar   | Selected window editor
Open windows                   Open windows    | Start and end IST
Confirmed appointments         Booked windows  | [Save] [Remove]
[Edit selected window]
```

Publish explicit date-based time windows in IST for the pilot. Show existing holds and bookings as occupied blocks. Reject edits that would invalidate live holds or confirmed bookings. A team member uses Support to resolve an existing booking. QA-04, QA-05.

### T06 · Team bookings · `/plus-one/team/bookings`

```text
PHONE                          LAPTOP
Team bookings                   Team bookings
[Upcoming] [Past]               [Upcoming] [Past]
[Appointment card]             Appointments | Selected booking details
Time · Purpose                 Appointments | [Open Chat] [Support]
[Open Chat] [Support]
```

Show assigned appointments with their booking status. Show the purpose to the assigned member after confirmation. Open the same booking detail and chat route as the customer with role-appropriate actions. Use an empty state that links to Availability. QA-06, QA-07.

## Review and support

### A01 · Application queue · `/plus-one/admin/applications`

```text
PHONE                          LAPTOP
Application queue               Application queue
[Pending] [Reviewed]            [Pending] [Reviewed]
[Applicant · City · Age check]  Queue rows | Selection prompt or preview
[Applicant · City · Age check]  Queue rows |
```

Sort pending oldest first. Filter by review status. List only fields needed for triage. A denied account receives the standard access screen without queue counts. Keep reviewed decisions searchable for authorized reviewers. QA-09.

### A02 · Application review · `/plus-one/admin/applications/[applicationId]`

```text
PHONE                          LAPTOP
[Queue] Application             Application review
Private submitted details       Submitted details | Verification checklist
Verification checklist          Decision history  | Reason and decision
Reason [Text field]                               | [Approve] [Decline]
[Approve] [Decline]
```

Confirm the intended decision and require a private reason. Record reviewer and timestamp and prevent duplicate or stale decisions. Use the approved manual process to review the submitted form and verify identity, adult eligibility, and background. Reject approval on the server and in the database if the required confirmations are missing. Store the verification outcome, with private records controlled by approved retention policy. QA-09.

### A03 · Support queue · `/plus-one/admin/cases`

```text
PHONE                          LAPTOP
Support cases                   Support cases
[Open] [In review] [Resolved]   [Type] [Status] [Owner]
[Payment · Ref · Status]        Cases | Selected case summary
[Report · Ref · Status]         Cases | [Open case]
```

Show late payments, cancellation requests, blocks affecting paid bookings, and reports. Treat individual message evidence and payment references as restricted case content. QA-06, QA-08.

### A04 · Case detail · `/plus-one/admin/cases/[caseId]`

```text
PHONE                          LAPTOP
[Cases] Case details            Case details
Reason · Owner · State          Booking/payment context | Owner and state
Relevant booking or report      Linked evidence         | Action history
[Assign] [Record action]                                | [Record action]
```

Operations records case owner, progress, decision and provider reference. Confirm refund eligibility against PO-08. Operations can request a refund once per decision and see pending or completed outcomes. Keep unrelated chats out of the case view. QA-06, QA-08.

## Implementation task

1. Build application form and status plus reviewer queue and decision. Use an isolated test account to confirm the application remains private and the approval unlock is immediate and durable.
2. Add approved registration, required profile checks, image editing and schedule controls. Enforce eligibility through directory, profile, and booking entry points.
3. Connect the team booking view and operations cases to PO-08 and PO-09. Walk through a declined application, a profile pause, a schedule conflict, and a paid booking requiring support.

**Acceptance:** all ten frames have working layouts for phone and laptop. Access is checked server-side. An approved applicant can publish and schedule bookings without a second account. Pending and declined applicants cannot appear in discovery or accept a booking.

[Airbnb identity verification](https://www.airbnb.com/help/article/1237) · [Airbnb calendar](https://www.airbnb.com/help/article/2645) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
