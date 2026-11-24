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

### Profile posts and sharing

**Status** Implemented and verified locally. Hosted rollout is pending. The November 23 feature brief specifies operator-managed, caption-free posts and sharing an eligible profile. It supersedes the earlier caption and posting-control sketches for this feature.

Baseline through Discover on port 3001: Meera's profile opens with its cover, details, and paid-chat message. At 320 px the details fall below the photo without overflow; at 1280 px the current layout is two columns. Preserve that layout for zero posts. Place Posts between the cover and details for populated profiles.

1. Add the private post and photo migration, reuse the Discover eligibility projection, and serve WebP photos through a verified read-only route and restrictive Storage policies.
2. Add the grid and accessible photo viewer, plus an exact profile share URL using the existing login return path.
3. Verify database permissions and the production Discover entry point with synthetic accounts and photos on website port 3001. Record hosted checks separately.
4. Document draft, upload, publication, and recovery in the README. Unpublish to remove subsequent access. A website rollback can leave the additive private migration and retained drafts in place.

**Results** The profile now has a read-only gallery between the cover and details, plus a Share profile button for every viewable member. The migration adds a private bucket and read projection. Each photo request rechecks the viewer, publication, and current member eligibility. The README covers the two-photo publish and unpublish workflow.

| Check | Result |
| --- | --- |
| `npm run lint`, `npm run typecheck`, `npm run build` | Passed. |
| `npm run test:browser` | 13 passed. Chrome opened the populated profile from Discover, checked five viewport widths, swiped using touch input, and verified buttons, keyboard navigation, focus and scroll restoration, photo and query errors, and the no-posts layout. |
| Sharing and sign-in | Synthetic browser APIs verified the native share payload, cancellation, clipboard fallback, and manual selection. A second synthetic session opened the exact link. The signed-out request returned the exact member path to Szocial login. |
| `tests/database/profile-posts.sql` | Passed on PGlite. Eligible photos were readable, draft and ineligible photos stayed hidden, and guest, ordinary, and owner permissions were checked against a broad fixture policy. Chrome also verified that a previously accessible photo returned 404 after unpublishing. |

Real-device sharing, authorized staging Storage checks, and the shared Szocial login round trip remain pending. The project owner applies the hosted migration and deploys the website. Drive publication remains pending the hosted gate.

### Meera's demo photo posts

Use the existing fictional portrait as the ImageGen reference. Create one post with four traditional outfits and one with two western dresses. Use distinct full body, half body, selfie, and posed compositions. Encode the six photos as web assets. Supply them through the existing gallery only when standalone demo mode is enabled, then verify both posts from Discover on port 3001.

**Results** The existing gallery shows four traditional photos in Meera's first demo post and two western dress photos in her second. The six WebP files are in [Meera's demo assets](../../public/discover/demo/meera-posts/).

Chrome on port 3001 verified both tiles from Discover, decoded all six photos, advanced through a real touch swipe and keyboard controls, restored focus, and checked widths of 320, 390, and 1280 px. Arjun's profile still omits Posts. Lint, type checks, and the production build passed.

**Image prompts** Built-in ImageGen used the existing Meera portrait as its identity reference. Each call asked for one realistic lifestyle photo of the same fictional adult, preserving her facial structure, complexion, dark eyes, and wavy hair. Each specified natural skin texture, realistic anatomy, one subject, and no panels, text, visible logos, or watermarks.

| Asset | Shot prompt |
| --- | --- |
| `traditional-saree.webp` | Full body head to toe, including shoes, standing relaxed on the steps of a shaded Mumbai heritage courtyard, with a softly smiling expression. She wears an emerald silk saree with a fine gold border and small gold earrings. Keep her face near the upper third but visible in a center square crop. Portrait frame. |
| `traditional-kurta.webp` | Waist-up candid portrait at a carved wood window in warm daylight, in an ivory embroidered kurta with an indigo dupatta. Her shoulder leans lightly against the frame as she looks over with a quiet smile. Portrait frame. |
| `traditional-selfie.webp` | Casual front-camera selfie, close head-and-shoulders framing with subtle arm's-length perspective and natural expression. She is on a quiet balcony with potted jasmine and wears a rose pink chikankari kurta with simple jhumkas. No visible phone. Square composition. |
| `traditional-lehenga.webp` | Three-quarter-length posed portrait in a deep plum lehenga with restrained gold embroidery and a draped dupatta, at a softly lit sandstone arch. Relaxed posture and naturally placed hands. Portrait frame. |
| `western-dress.webp` | Full body head to toe with head and shoes comfortably inside the frame, taking a casual step past an old bookshop window in a slate blue sleeveless belted midi dress with simple flats. Candid natural street photograph, warm daylight. Portrait frame. |
| `western-portrait.webp` | Half-body seated portrait at a leafy cafe window in a rust red one-piece wrap dress, with subtle gold hoops. Frame from the waist up as she turns toward the photographer with a natural, unposed smile. Portrait frame. |

### Team member publishing

The latest request expands operator-only posting to approved members with an eligible profile. Add a form in Team setup and keep the existing three-column profile grid and swipe viewer. The browser sends one ordered group of photos to a verified server action. The action validates and re-encodes the images, uploads to the existing private bucket, and uses a dedicated SQL function to publish the post and its slides together. The database derives the profile from the verified actor. Verify owner publishing, ordinary-account denial, invalid media, and the Discover result on 3001. Apply the additive migration only in an authorized environment. The operator can unpublish any post via the existing runbook.

**Results** Eligible profile owners now have a Create post link leading to Team setup. The first photo becomes the thumbnail for the full swipeable post. The public profile uses a compact grid and a labelled Posts header with a grid icon. Browser accounts still have no direct Storage write permission.

Lint, typecheck, the production build, and all 14 local tests passed. At 320 px, the eligible owner rejected a fake WebP, uploaded two photos, and returned to their profile. A separate account viewed both photos in order through Discover and had no publishing access. The isolated database checks also passed for missing uploads and paused profiles. Hosted migration and real Storage uploads are pending staging verification. [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
