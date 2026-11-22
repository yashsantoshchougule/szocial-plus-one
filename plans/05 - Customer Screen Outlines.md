# Customer Screen Outlines

**Task PO-05 · Must Fix · Planned**  
Depends on PO-04, with PO-03 for identity and PO-08 and PO-09 for payment and chat states.

## Layout and interaction

Design at 390 px and 1280 px. Use one column below 768 px, two directory cards per row at tablet widths, and three cards at 1024 px and above. Mobile navigation provides Home, Discover, Bookings and Chats. On desktop, use a compact header and persistent navigation. Reserve room for sticky booking controls and the mobile keyboard. Use one card link, visible focus, meaningful photo alt text, and labeled status indicators. Use area names instead of precise locations. All paths in this document are public paths.

Wireframes use `[action]` for interactive elements. Vertical lines show stacking. Columns show content visible simultaneously.

### C01 · Szocial resident Home · `/home`

```text
PHONE                          LAPTOP
Szocial header                 Szocial header
Resident Home                  Nav | Resident Home
[Open Plus One]                Nav | [Open Plus One]
Existing feed                  Nav | Existing feed
```

Keep the one-click entry in the resident Home body at both sizes. For rollout, display it only when the gate is enabled. Expired sessions use existing Szocial login and resume the approved path. QA-01.

### C02 · Starter · `/plus-one`

```text
PHONE                          LAPTOP
[Back to Szocial]              [Back to Szocial]          Plus One
Find a Plus One                Why book a Plus One | How it works
Platonic, hourly outings       Coffee, outing, event | Pick → pay → chat
Pick → pay → chat              [Explore] [Apply]
[Explore Plus One]
[Become a Team Member]
```

Explain hourly pricing and private chat after payment. Continue to the Plus One dashboard. The current implementation remembers starter completion with a browser cookie. Signed-in account preferences depend on shared sign-in integration. Return visits can reopen the introduction from help or navigation. QA-01.

### Post-startup dashboard · `/plus-one/dashboard`

Show a primary Discover action, shortcuts to bookings and private chats, and a public meetup tip. Team membership shows the signed-in applicant’s own status when available. Approved applicants can open team setup. Reviewers with an active assignment can open the application queue. Home opens the dashboard, and How Plus One works reopens the starter.

### C03 · Discover · `/plus-one/discover`

```text
PHONE                          LAPTOP
Discover                       Discover                  [Apply]
[Area] [Activity]              [Area] [Activity]  [Clear]
┌─────────────────────┐        [Photo card] [Photo card] [Photo card]
│ Photo               │        Name · Area · ₹/hr · Availability
│ Name · Area         │        [Photo card] [Photo card] [Photo card]
│ Activity · ₹/hr     │
│ Currently busy      │
└─────────────────────┘
Discover · Bookings · Chats
```

Only show eligible listings. A busy member can still have future availability. Use a photo placeholder during load, preserve active filters on retry, and offer **Clear filters** for a filtered empty state. For an empty pilot directory, show the starter or application link. QA-02.

### C04 · Team member profile · `/plus-one/members/[memberId]`

```text
PHONE                          LAPTOP
[Back]    Team member          [Discover]  Team member
Lead photo                     Lead photo | Name · Area · Languages
Name · Area · ₹/hour                      | Bio · Interests · Rate
Bio · Languages · Interests    Posts  [Photo] [Photo] [Photo] [Photo]
Posts  [Photo] [Photo] [Photo]  [Rent a Friend]    [Chat]
[Rent a Friend]    [Chat 🔒]
```

Use a 3-up, square, photo-first grid on phones. A selected post opens an accessible photo viewer with a caption and Close. Show Chat with “Opens after payment” until a matching booking exists. With multiple existing paid threads for the member, show My Bookings filtered to that member. An unpublished or unknown profile uses a neutral unavailable state and a Discover link. QA-02, QA-07.

### C05 · Booking · `/plus-one/members/[memberId]/book`

```text
PHONE                          LAPTOP
[Back]  Book a Plus One        Book a Plus One
Member · ₹/hour                Purpose + duration | Member and rate
Purpose [Text field]           Date and start slots| Date · Duration
Duration [60] [90] [...]        Eligibility + terms | Total [Pay]
Date [Pick a date]
Start [3:00] [4:30] [Booked]
Eligibility and terms
₹900 total     [Pay ₹900]
```

Example copy for ₹600/hour and 90 minutes. Label available, held, busy, booked, and unavailable times in text. Announce changed totals and errors. Keep purpose, date and duration after a conflict. The participant can select another start and get a fresh quote. Confirm the full amount before launching Razorpay's hosted checkout. QA-03, QA-04, QA-05.

### C06 · Checkout return and payment status · `/plus-one/bookings/[bookingId]/payment`

```text
PHONE                          LAPTOP
Checking payment               Booking reference and status
Booking reference              Member/date/time | Amount · Status
Member/date/time · Total                         | [Open Chat]
[Open Chat] or [Try again]     [My Bookings]     | [Get support]
[My Bookings]  [Get support]
```

Keep the merchant page behind hosted checkout. On return, show verifying, confirmed, failed, expired, refund pending, or refunded. Open the private conversation after successful server confirmation. Provide a durable Open Chat action if navigation was interrupted. For a still-open checkout attempt, retry verification. For an expired attempt, offer a new slot and show refund status if applicable. QA-06.

### C07 · My Bookings · `/plus-one/bookings`

```text
PHONE                          LAPTOP
My Bookings                    My Bookings
[Upcoming] [Past]              [Upcoming] [Past]
[Member, time, status]         Booking list | Selected booking summary
[Member, time, status]         Booking list | [Open booking]
Discover · Bookings · Chats
```

Sort upcoming by start and past newest first. Keep processing and refund status discoverable. Use an empty message with **Explore Plus One**. A filtered entry from a profile keeps the selected member visible. QA-03, QA-06.

### C08 · Booking detail · `/plus-one/bookings/[bookingId]`

```text
PHONE                          LAPTOP
[Back]   Booking detail        [My Bookings]  Booking detail
Booking and payment statuses   Schedule + purpose | Payment breakdown
Date · Duration · Purpose     Meeting guidance   | [Open Chat]
Amount · Payment reference                        | [Get support]
[Open Chat]   [Get support]
```

Show status appropriate to both booking and payment, including terminal cancellation and refund outcomes. The CTA becomes **View chat history** when read-only. Support accepts the booking reference automatically. A nonparticipant sees a generic unavailable page. QA-06, QA-07.

### C09 · Inbox · `/plus-one/chats`

```text
PHONE                          LAPTOP
Chats [Restricted]             Chats         [Restricted]
Name · Booking time            [Thread]     | Select a conversation
Last visible message           [Thread]     | Booking chat appears here
Discover · Bookings · Chats
```

Show only the signed-in user's threads. A message removed from that user's view disappears from their preview. Restricted threads stay in the indicated view. Empty state links to bookings. QA-07, QA-08.

### C10 · Conversation · `/plus-one/chats/[conversationId]`

```text
PHONE                          LAPTOP
[Chats] Name   [More]           Inbox     | Name · Booking      [More]
Booking date and status        [Thread]  | Booking guidance
Message history                [Thread]  | Message history
[Message…] [Send]                        | [Message…] [Send]
```

Menu contains Block, Restrict, Report and Support. Each message has a keyboard-accessible Delete for me action. Preserve the draft when sending fails and show retry. When blocked or closed, replace the composer with status and the appropriate support or history action. Restore scroll and earlier history when loading older messages. QA-07, QA-08.

## Implementation task

1. Build the responsive shell, shared status patterns and directory components. Run the smallest supported layout at 320 px before adding tablet and desktop columns.
2. Connect account and directory data, then add booking/history and chat screens as PO-08 and PO-09 expose their contracts.
3. Verify the common loading and permission states and the charted paths. Use real button labels and announcements for async changes.

**Acceptance:** each C01–C10 frame has phone and desktop implementation, one clear next step, and the specified success or recovery state. Profiles and billing details render without horizontal scrolling at 320 px.

[RentAFriend discovery](https://support.rentafriend.com/article/330-how-does-rent-a-friend-work) · [Airbnb calendar](https://www.airbnb.com/help/article/2645) · [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
