# Scalability and Performance

**Task PO-11 · Must Fix · Planned**  
Start with PO-01 scaffold and PO-03 shared entry. Verify with PO-05 customer journeys, PO-07 data access, PO-08 booking and payments, and PO-09 chat. QA-10 is the launch gate.

## Performance and capacity targets

These are initial engineering targets. Concurrent sessions are people active during the same test window. Requests per second and live connections describe the actual work the platform must handle. Publish verified capacity only for the traffic mix, infrastructure, and data size tested.

| Measure | Proposed target |
|---|---|
| Sustained peak | 1,000 concurrent signed-in sessions over 30 minutes, with 100 first-party read requests and 20 writes per second across those sessions. Include 300 simultaneous private chat connections as part of those sessions. |
| Mobile page experience | At the 75th percentile of real mobile visits, Largest Contentful Paint ≤2.5 s, Interaction to Next Paint ≤200 ms, and Cumulative Layout Shift ≤0.1. Measure starter, Discover, profile and booking first. [Core Web Vitals](https://web.dev/articles/vitals) |
| Directory and profile | 95% of first-party reads finish within 500 ms during sustained peak. |
| Availability and booking | 95% of availability reads finish within 750 ms and 95% of hold requests within 1 s. Gateway redirect or Razorpay processing time is measured separately. |
| Chat | 95% of successful messages become visible to the other connected participant within 1 s of server acknowledgment. |
| Errors and recovery | Unexpected first-party errors and timeouts stay below 0.5% during sustained peak. A five-minute burst at twice the test arrival rates returns to the sustained targets within two minutes of returning to baseline traffic. |

Use a repeatable mid-range mobile profile with a constrained mobile connection for staging browser checks, including cold visits. Check page rendering and recorded navigation and interaction traces under load. Track field Core Web Vitals separately once real traffic is available. Report dropped test iterations and missing samples with the results.

## Build for the busy paths

1. **Scaffold and deployment.** Keep Plus One as one stateless Next.js app that can run on multiple instances. Store durable state in Supabase. Put the app server close to its database region and time requests through the canonical Szocial origin. Track request latency and errors by route, plus auth, database, and provider timings. Leave message content, booking purpose and personal data out of routine metrics.
2. **Directory and profiles.** Server-render the first page, use cursor pagination, select only fields each screen needs, and avoid a separate database query per card. Return size-appropriate images, reserve image space, and lazy-load photos below the fold. Cache static assets at the edge. Where measured demand warrants it, cache only listing fields that are safe to share across authorized viewers, and invalidate on eligibility, publication, rate, or profile changes. Keep session checks and viewer-specific filters outside shared caches. Serve protected media according to its authorization and expiry. [Next.js caching](https://nextjs.org/docs/app/guides/caching-without-cache-components) · [Next.js image handling](https://nextjs.org/docs/app/api-reference/components/image)
3. **Availability and checkout.** Read only windows, booking states, and prices relevant to the selected date and member. Index the actual availability and booking-history queries, then confirm query plans on synthetic pilot-scale data. Recheck every quote and slot at hold creation. Keep the per-member transaction and overlap constraint short. Run Razorpay network calls outside the transaction, preserve idempotency, and rate-limit repeated checkout creation. Monitor pool wait and lock time. Use connection pooling if the server connects directly to PostgreSQL. [Supabase connection options](https://supabase.com/docs/guides/database/connecting-to-postgres)
4. **Chat.** Fetch a bounded page of recent messages. Keep the active private thread subscribed and consolidate any inbox updates instead of opening a subscription per booking. Back off reconnects with jitter, then fetch missed history using the last cursor. Check the selected Supabase plan's connection and event limits before running the peak scenario. [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/quotas)

## Verification and scale-up

1. **Baseline early.** Measure the authenticated starter and first directory page before the booking features land. Record browser profile, network conditions, cache state, staging region, build, and first-party request timings.
2. **Run the steady peak.** Use synthetic accounts and realistic profile, post, booking, and chat history sizes in an isolated, authorized staging environment. Drive independent read and write arrival rates with k6 and measure concurrent sessions and chat connections separately. Use roughly 80 directory/profile reads and 20 availability/history reads per second, with 5 hold requests and 15 chat messages per second. Allocate enough eligible slots for the full run. Use a staging payment fixture to exercise checkout state with controlled load and reserve Razorpay test mode for focused integration checks within provider limits. [k6 arrival-rate testing](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)
3. **Test the failure paths.** In addition to the traffic burst, send 50 simultaneous hold attempts for one test slot and require exactly one winner. Replay duplicate or reordered payment events and reconnect 300 chat clients in a controlled wave. Verify that no overlapping reservations, duplicate confirmations or conversations, cross-account cache responses, or unauthorized chat events occur. At overload, return bounded retry feedback and keep status and reconciliation available.
4. **Record and raise proven capacity.** Record endpoint latency percentiles, successful work rate, database pool wait and query time, lock contention, connection utilization, and cache behavior. Fix the first measured bottleneck and repeat the same workload. The next proposed growth benchmark is 5,000 active sessions with the same traffic proportions. Verify provider quotas and available infrastructure before raising the advertised or operating capacity.

**Acceptance:** PO-10 records the test run and infrastructure, the mobile and sustained-load targets pass, and the burst and booking-integrity checks pass. The project owner has deferred code and database work. This document sets targets for later implementation and verification.
