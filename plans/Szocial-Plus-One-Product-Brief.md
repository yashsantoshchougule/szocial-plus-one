# Szocial Plus One

Product brief · 20 November 2026

Szocial Plus One is a separate part of Szocial where a signed-in user can book an approved team member by the hour for platonic companionship. Example activities include coffee, a city outing, or attending an event together. The product starts from a one-click entry in Szocial and uses the same account. Development repository [Szocial-Plus-One](https://github.com/vishv-tech/Szocial-Plus-One).

## Confirmed product requirements

| Screen or feature | Required behavior |
|---|---|
| Entry from Szocial | One click takes a signed-in user to Plus One. Their existing Szocial account carries across without a separate Plus One login or signup. |
| Starter page | Explain why Plus One exists, what “rent a friend” means, how hourly booking works, and what happens after payment. Give users a way to continue to the homepage. |
| Team member application | A **Become a Team Member** section lets signed-in Szocial users submit an application form with their existing account. Only applicants approved by Szocial can register as team members and become eligible to appear in the booking directory. |
| Homepage | Show only approved, bookable team members in cards with profile photos. The entire card opens that team member’s profile. |
| Team member profile | Show the details the team member has uploaded and their posts in a photo-first grid inspired by Instagram. Place **Rent a Friend** and **Chat** below the profile content. Before payment, Chat is locked. |
| Booking page | Ask for the purpose of the meetup and how long the user wants to book. Select an available date and start time to support advance bookings. Calculate and show the total using the team member’s rate in ₹/hour. |
| After payment | Open the private chat for that booking so the user and team member can agree on where to meet and coordinate the outing. This also applies to a paid advance booking. |
| Availability | Show **Currently busy** or **Unavailable** when applicable. The occupied period cannot be booked. Users can still reserve free future slots. Show **Already booked** on future slots reserved by someone else. |
| Dedicated chat page | Provide a page for Plus One conversations. Save message history so it remains visible when users return. Both sides can delete a message from their own view. The other participant keeps their copy. |
| Chat controls | Both sides have **Block** and **Restrict** controls. Their exact effects on a paid booking are a policy decision. |

The supplied RentAFriend screenshot is a reference for photo prominence and the arrangement of bio, language, and location details. Use a distinct Szocial design, an Instagram-inspired posts grid, and the Plus One booking and chat actions. Suggested card fields are display name, profile photo, city or general area, activity tags, hourly rate, and availability. Suggested profile fields also include bio, interests, and languages.

Suggested starter copy

> Find a Plus One for coffee, an outing, or an event. Choose a Szocial team member, book their time by the hour, and chat in Plus One after your booking is paid to plan where to meet.

## Team member applications

Signed-in users open **Become a Team Member**, fill in the application form, and submit it for review. A submitted application is **Pending review**. An authorized Szocial admin reviews it and records an **Approved** or **Declined** decision. Applications stay private to the applicant and authorized reviewers.

Approval enables the applicant to complete their registration as a team member using their existing Szocial account. Once their profile setup is complete, they can appear in the directory and accept bookings during their published availability. Pending or declined applicants retain their regular Szocial account access and remain outside the booking directory.

Suggested form fields include display name, city or general area, languages, a short introduction, and preferred activities. The application screening criteria and any verification steps are open decisions.

## Recommended booking and availability rules

| Status | What users see and can do |
|---|---|
| Available | The chosen period is bookable. |
| Currently busy | Now is occupied. The user can browse open future times. |
| Unavailable | The team member marked the period off or it falls outside published hours. The user can select another open slot. |
| Already booked | A confirmed booking occupies this future period. Show the blocked time while keeping the customer’s identity and purpose private. |
| Temporarily held | Optional checkout state. A short hold prevents another user from starting checkout for the same slot. A failed or abandoned checkout releases the hold when it expires. |

- Treat availability as a property of the selected date, start time, and duration. A team member can be busy now, booked tomorrow evening, and available tomorrow afternoon.
- Require the full duration to fit an available window. For example, if Saturday 4–6 p.m. IST is booked, a request for 3–5 p.m. also conflicts. A request starting at 6 p.m. can work if the next slot is open and any travel buffer is satisfied.
- Show the hourly rate and total before payment. Calculate the authoritative quote on the server, store amounts in paise, and save the rate and duration with the booking. A sample rate of ₹600/hour for 90 minutes gives a ₹900 base price if 90-minute bookings are supported.
- Give users a **My Bookings** view for upcoming and past bookings, payment confirmation, and access to the matching chat. Give team members a schedule and a way to set availability, review bookings, update their profiles and posts, and open their chats.

## Recommended implementation details

### Shared Szocial account

Reuse the Szocial user identity and existing Supabase Auth. With a separate development repository, consider serving Plus One under the same public origin at a path such as `/plus-one` if the deployment supports it. A subdomain deployment needs a deliberate session strategy. Depending on the chosen hosts, use appropriately scoped cookies or a secure server-mediated sign-in handoff. Keep raw session tokens out of redirect URLs. For a direct visit with an expired session, use the existing Szocial sign-in and return the user to Plus One. Verify direct links, expiry, and sign-out across both products.

### Booking and payment

Store booking time ranges and enforce non-overlap in PostgreSQL per team member so simultaneous checkouts cannot both claim a confirmed slot. A database exclusion constraint can cover active holds and confirmed bookings, with explicit expiry handling for holds. Store times with timezone information and display them in IST for the Mumbai launch.

If using Razorpay, create the order on the server from the server-calculated amount. Keep Chat locked until the server verifies a captured payment for the matching order and amount and the booking is confirmed. Process duplicate or delayed provider events safely so one booking gets one conversation. If payment arrives after a hold expired and the slot has been claimed, resolve the payment through the agreed refund or support flow. An unpaid or failed checkout keeps Chat locked.

### Private chat and moderation

- Use a conversation tied to each paid booking for a clear record. Enforce access for the booker and assigned team member on the server and in database policies, including realtime subscriptions if added.
- **Delete for me** changes visibility only for the person who selected it. Save that visibility separately from the message. The same behavior applies to both roles and persists after reload.
- **Restrict** can move the thread to Restricted, mute notifications, and hide read receipts from the restricted account. Keep it private and reversible. This is a proposed adaptation of Instagram’s Restrict.
- **Block** can stop new messages between the pair in Plus One and prevent new bookings between them. Keep their existing history accessible subject to the product’s retention policy. Add a separate **Report** action. For an active paid booking, surface support and a clear cancellation and refund process.
- Suggested launch safeguards include adult participants, team-member verification, public first-meeting guidance, and keeping personal contact information private by default. Define transcript retention, account-erasure handling, and access for reported conversations before launch. In-app message behavior and account-level privacy handling are separate product decisions.

## Research references

| Reference | Application to Plus One |
|---|---|
| [RentAFriend](https://support.rentafriend.com/article/330-how-does-rent-a-friend-work) | Location-based discovery, profile photos and interests, and a contact gate. Its gate is a membership. Plus One unlocks chat through the paid booking itself. |
| [Rent a Friend India](https://www.rentafriendindia.com/contactus) | The indexed Mumbai offering lists coffee hangouts, outings, and event companions. It illustrates activity labels and hourly or fixed-duration presentation in rupees. The indexed offer is market context. |
| [Airbnb Experiences](https://www.airbnb.com/help/article/2645) | A host calendar publishes availability by date and time. This is a model for showing free and occupied booking windows. |
| [Instagram Restrict](https://about.fb.com/news/2019/10/empowering-our-community-to-stand-up-to-bullying/) | Instagram routes restricted messages to requests, mutes alerts, and hides read and activity status. Plus One can adapt these controls for paid booking conversations. |
| [Bumble BFF](https://bumble.com/bff/friendship/safe-online-friends) | Public first meetings and sharing plans with a trusted person are precedents for a short meeting-safety note. |

Technical references

- [Supabase session model](https://supabase.com/docs/guides/auth/sessions) and [MDN cookie domain scope](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
- [PostgreSQL range types and exclusion constraints](https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT).
- [Razorpay payment events](https://razorpay.com/docs/webhooks/payments) and [webhook validation and duplicate delivery](https://razorpay.com/docs/webhooks/validate-test).
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [India’s Digital Personal Data Protection Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf) and [the phased commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) for reviewing retention and erasure before launch.

## Decisions still open

| Decision | What needs to be settled |
|---|---|
| Team member applications | Final form fields, screening criteria, and any verification steps for reviewers. |
| Booking confirmation | Instant booking for published slots or team-member approval before payment. |
| Rates and duration | Who sets hourly rates, minimum duration, time increments, change rules, and any fee breakdown. |
| Schedule | Booking lead time, how far ahead people can book, and travel buffers between appointments. |
| Cancellations and payouts | Refund rules for cancellations by either side, rescheduling, no-shows, active bookings affected by a block or report, and how team members are paid if applicable. |
| Starter and posts | Whether the starter shows every visit or first visit only, plus whether posts support captions, photos, videos, likes, or comments at launch. |
| Chat lifecycle | Whether sending remains open after the booking ends, how past threads remain accessible, and how long to retain messages. |
| Deployment | Same-origin path or subdomain, and how to integrate the existing Szocial account session. |

## Acceptance checks for implementation

1. A signed-in customer opens Plus One from Szocial and can continue from the starter page without signing in again.
2. The entire team-member card opens the correct profile. The profile shows the uploaded details and posts, with a locked Chat action before payment.
3. A customer can enter the booking purpose and duration, choose an available time, and see the correct INR total before checkout.
4. A busy current period and a booked future period both reject overlapping bookings, while another free future slot remains selectable.
5. Concurrent attempts for the same period cannot both become confirmed. Failed, duplicate, and delayed payment events do not grant unauthorized chat access or create duplicate threads.
6. A verified paid booking unlocks chat for its two participants. Other users cannot read or write to that chat.
7. Messages survive reload and repeat visits. Deleting a message from either participant’s view leaves it visible to the other participant. Block and Restrict follow the agreed behavior.
8. A signed-in user can submit a team member application. Pending and declined applicants stay out of search, the directory, and booking endpoints. Only an authorized reviewer can approve an application, and the approved applicant can then complete team member registration.
