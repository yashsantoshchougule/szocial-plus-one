# ORD-04 — Mobile website shell and starter

**Priority** Must Fix  
**Source** Order 04 in the [master checklist](../plans/prompts/00%20-%20Source%20Orders.md). [Customer screen outlines](../plans/05%20-%20Customer%20Screen%20Outlines.md)

## Implementation prompt

Build the responsive website shell and starter experience under `/plus-one`. Explain hourly platonic companionship, choosing a time, payment, and private coordination. Provide direct Discover, Bookings, and Chats links. Write usable empty, loading, and recovery states for the shell.

**Dependencies** Existing Next.js scaffold, Node 24, and the supplied product brief. Shared sign-in and database access are deferred. Remember starter completion with a browser-only preference during that period, with no account data stored in it.

**Acceptance criteria**

- First visits show the starter. Explore Plus One records completion and opens Discover. A returning browser reaches Discover directly and can reopen the introduction.
- Discover, Bookings, and Chats render directly at their prefixed URLs and are reachable from the mobile and desktop navigation.
- Navigation exposes active state, visible keyboard focus, and a way back from an unavailable route. The shell provides loading, empty, and retry states.
- Lint, types, the production build, and browser checks pass. Feature-specific data and actions remain with their later orders.

## Implementation plan

1. Move the starter into the customer route group and put the persistent navigation in its layout. Keep the existing `/plus-one` build prefix and production health route.
2. Build the first-visit starter and a small, scoped preference POST. Keep direct links independent of the starter preference. Add a deliberate route back to the introduction for returning visitors.
3. Add the three route destinations with honest empty states, a shared loading state, and a retryable error boundary. Preserve links under the public prefix.
4. Extend the existing production browser test to cover first visit, completion and return, direct links, recovery, and phone and desktop layouts. Run lint and type-check, then build and run the browser checks. Upload and verify this one file after the checks pass.

[Next.js cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) · [Loading UI](https://nextjs.org/docs/app/api-reference/file-conventions/loading) · [Error recovery](https://nextjs.org/docs/app/api-reference/file-conventions/error)

## Changes and verification

**Result** Resolved locally. Order 04 implements the Plus One starter and responsive customer shell. Discover, Bookings, and Chats have direct routes and empty states. The shell includes keyboard skip navigation, active-link state, loading and retry components, and a missing-page recovery link.

The Explore action saves an HTTP-only, path-scoped browser preference and redirects to Discover. Later visits to the root reach Discover, and How Plus One works reopens the introduction. The preference contains no identity and is browser-local until shared account settings are available. The starter explains team membership and the subsequent review process. The application form belongs to Order 05.

| Command | Actual result |
|---|---|
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed after regenerating route types. The type-check script now runs `next typegen` before TypeScript so route moves do not leave stale references. |
| `npm run build` | Passed with Next.js 16.4.6. Discover, Bookings, and Chats are prerendered. The starter reads its preference at request time. |
| `npm run test:browser` | 4 passed, 0 failed. Verified production starter and prefixed assets, 320 px reflow, mobile keyboard focus, scoped cookie and repeat visits, navigation at 1280 px, direct links, 404 recovery, and the starter form with browser JavaScript disabled. The retry used a path-and-query assertion for the normalized introduction URL. |

**Limits** Browser QA covered missing-page recovery. The generic server-error boundary and loading component are present, with a forced server exception and artificial loading delay outside this test run. Shared sign-in, database, and feature-specific content remain deferred.
