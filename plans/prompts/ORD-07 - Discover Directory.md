# ORD-07 — Discover directory

## Implementation prompt

Build the signed-in Discover website and its directory backend. Provide area and activity filters, cursor pagination, responsive profile cards, and a working member detail link. Keep draft, paused, incomplete, and unapproved listings outside Discover and direct profile reads. Use the existing private Plus One schema and verified Szocial identity.

## Plan

1. Add the private team profile read model and indexes. Project only approved, published, booking-enabled listings with a cover reference. Show the listing's booking state without claiming a specific slot is free.
2. Read one bounded page through the existing PostgreSQL role. Normalize filters and validate cursor values. Use a dedicated private Storage bucket and issue short-lived cover URLs in a batch. Keep operator and applicant data out of the projection.
3. Build the Discover search form, one-link cards, loading and retry states, and member detail route. Use an editorial Mumbai image for the header and preserve the standalone empty preview when Auth is unconfigured.
4. Verify the actual SQL against a disposable database, then exercise the production UI with seeded fixtures. Check owner data privacy, pagination, filter recovery, direct links, and mobile widths.

Profile management, upload tools, booking, and chat remain separate. This order adds a read contract for future profile publication. Apply migrations only in an authorized environment. The website continues to show an empty state until eligible profiles have been published.

[Customer screen outlines](../05%20-%20Customer%20Screen%20Outlines.md) · [PostgreSQL indexes and ordering](https://www.postgresql.org/docs/current/indexes-ordering.html) · [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Verification

**Status** Discover is implemented and verified locally. The hosted migration, profile publishing workflow, and live data verification are pending.

### Implemented

- Discover has area and activity filters, 12 results per page, stable cursor pagination, whole-card links, and responsive one-, two-, and three-column layouts. Empty, signed-out, loading, and failed-query states have recovery actions.
- Member details show only display fields, general area, languages, activities, hourly rate, cover, and booking state. The booking state distinguishes currently busy profiles from profiles accepting booking requests. The availability workflow determines specific start times.
- The private data projection requires an approved application, a published profile, booking acceptance, and a cover reference. The server uses verified identity and parameterized PostgreSQL reads. The browser cannot read the underlying profile or application records through the directory.
- Approved cover keys use a dedicated private Supabase Storage bucket. One signed URL batch covers each result page. URLs expire after 120 seconds. The QA fixture exercised the SQL policies and the application used a loopback Storage API fixture. Hosted Storage remains unverified.
- The standalone preview uses locally generated Kala Ghoda imagery. The [large](../../public/discover/kala-ghoda.webp) and [small](../../public/discover/kala-ghoda-640.webp) WebPs were encoded directly from the original. The brief requested a crisp editorial photograph of a sunny Mumbai street with heritage buildings, tropical greenery, and an outdoor café.

### Verification

| Check | Result |
| --- | --- |
| `npm run lint`, `npm run typecheck`, `npm run build` | Passed. |
| `npm run test:browser` | All 11 checks passed. Chrome exercised filtering, empty-state recovery, stable pagination with identical timestamps, signed cover delivery, member details, and five viewport widths from 320 to 1440 px. |
| `tests/database/ord07_discover.sql` | Passed on isolated PostgreSQL via PGlite. Tested approved and busy visibility, blocked private profile reads, hidden draft and paused listings, unauthorized cover reads and writes, and unchanged access to unrelated storage objects. |
| First-page loopback timing | Latest observed response start was 29 ms in Chrome using the synthetic dataset. This is a local baseline. |
| Production-mode visual preview | Verified on 390 px mobile and 1440 px desktop. |

### Pending

No hosted database or Storage changes were applied. Profile registration, photo uploads, publication controls, booking availability, and paid conversations remain separate work. Published profiles and deployed migrations are required for live Discover results. The standalone preview shows the empty directory until eligible profiles are available. Drive publishing remains pending hosted verification.



### Local demo follow-up

The standalone preview can show four clearly marked fictional profiles with generated WebP portraits. Start the preview with `PLUS_ONE_DISCOVER_DEMO=1` and blank Auth, database, and Main Szocial settings to enable it. The demo shares Discover filters and detail pages with the directory.

Chrome verified all four portrait loads and profile links, plus mobile filtering and reset. Lint, type-check, the production build, and all 11 existing tests passed.

### Activity filter follow-up

Changing Activity now submits the same Discover search immediately and keeps the scroll position. The search button still applies a typed area. In the local demo, City outings showed only Arjun Mehta, Any activity restored all four profiles, and the Powai search returned Ananya Rao. Lint, type-check, production build and all 11 regression checks passed.