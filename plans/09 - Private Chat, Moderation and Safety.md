# Private Chat, Moderation and Safety

**Task PO-09 · Must Fix · Planned**  
Depends on PO-07 access rules and PO-08 confirmed booking transaction. Output: private paid conversations, persisted controls and auditable moderation.

## Conversation lifecycle

- Each verified confirmed booking has one conversation. The two participants are the booker and the assigned team member. This includes paid advance bookings. Use the booking ID as the conversation creation key and return the existing conversation on retry.
- Access checks apply to conversation and booking queries, message reads and sends, history pagination, message controls, and realtime updates. Unpaid, expired and ineligible sessions receive no access beyond their permitted booking status.
- Load recent text messages in timestamp and ID order. Load older history with a cursor. After focus or reconnect, fetch from the last known watermark and merge by message ID to repair missed updates. Keep a draft after a failed send and reuse its client send ID.
- Proposed sending window ends 24 hours after booking end. Cancelled and blocked threads become read-only immediately. Participants retain history within the approved retention period.

## Controls

| Control | Result | Active or future paid booking |
|---|---|---|
| Delete for me | Apply a viewer-specific hide to one message. Exclude it from the viewer's history and inbox preview after reload. The other participant keeps their visible copy. | Booking and chat remain available to the extent allowed by their state. |
| Restrict | Move the thread to the acting user's Restricted view and suppress its alerts. Keep the action private and reversible. | Both participants can still coordinate in the thread. Surface an easy route to retrieve it. |
| Block | Stop pair messaging and new bookings in either direction. Preserve retained history. Maintain each user's independent block. | Show a case reference and support action. Operations decides cancellation, resolution and refund under approved policy. |
| Report | Submit a reason and optional relevant message references. Give the reporting user a case reference. | Keep reporting and support reachable from booking detail even if the composer is unavailable. |

Restrict affects one user's presentation. Block changes authorization. Recheck pair block and booking state inside transactional send and checkout paths so stale tabs cannot continue. Unblocking one side restores eligibility only if the other side has no active block and the booking's sending window is open.

## Meeting safety and privacy

Propose adult participation and reviewer verification of team members. Describe paid platonic meetups clearly. Show public first-meeting guidance in booking detail and at the first thread opening. Keep private contact details out of directory and profile records. Keep the agreed meetup location inside the paid chat. Select a verified support workflow and staffed escalation path before taking paid bookings.

Propose a 90-day post-booking transcript retention period. Before rollout, approve the exact treatment for report evidence, account erasure, privacy requests, records needed for payment or dispute handling, and how support can view relevant evidence. Schedule retention tasks only after policy approval. Audit case access and keep routine metrics free of message contents. [Bumble BFF meeting guidance](https://bumble.com/bff/friendship/safe-online-friends) · [India DPDP Act](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf) · [Commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)

## Implementation task

1. Build the inbox, thread, accessible menu and message affordances defined in PO-05. Support paid advance bookings and read-only history.
2. Implement idempotent sends, row-level membership, message hiding, and realtime subscriptions limited to authorized participants. Test reconnect, race, and persistence.
3. Add Restrict, Block, Report, and case links for both roles. Apply transactional checks and route active block cases to operations.
4. Verify independent permissions using two participants, an unrelated account, a reviewer and authorized operations. Test both sides of Delete for me and independent directional blocks. Include cancellation, open/closed sending windows and case-bound report access.

**Acceptance:** payment gating is durable. A third party cannot read, send, or subscribe to a participant's thread. Both users can independently hide, restrict and block. Case access and retention follow the approved policy.

[Meta Restrict](https://about.fb.com/news/2019/10/empowering-our-community-to-stand-up-to-bullying/) · [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
