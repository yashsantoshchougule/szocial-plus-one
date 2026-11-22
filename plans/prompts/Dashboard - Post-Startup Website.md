# Post-startup dashboard

**Scope** Customer website landing after the existing starter, with links into the current customer and team workflows.

## Baseline and implementation plan

1. Change the starter POST and repeat-visit redirect from Discover to `/dashboard`, keeping the existing completion cookie and `?intro=1` entry. Add Home to shared navigation while keeping direct routes available.
2. Build a mobile-first dashboard with a local Mumbai café image, a Discover action, and links to bookings, private chats, team applications, and the introduction. Use actual destination states instead of displaying sample booking or chat counts.
3. Read only the current verified applicant’s status and their reviewer assignment using the existing session adapter. Show pending, approved, or declined status when present. Show team setup after approval and the queue for assigned reviewers. Existing destination guards continue to enforce access.
4. Verify startup redirects with and without JavaScript, direct links, account privacy, and display at 320, 390, 768, 1280, and 1440 px. Run lint, type-check, the production build, and the browser suite. Use loopback fixtures for session-dependent checks.

The shared Szocial sign-in and database remain deferred. The dashboard changes only the destination recorded by existing starter behavior. Reverting the two redirects restores the prior route for existing completion cookies.

[Customer screen outlines](../05%20-%20Customer%20Screen%20Outlines.md) · [Next.js base path](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) · [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)

## Verification

**Resolved locally.** The starter and returning visits open the dashboard. Home stays visible on mobile and desktop, and direct links to Discover, Bookings, Chats, and team applications are available from the dashboard. The role and application panels use the existing authorized queries. The project’s existing empty states handle activity that has yet to begin.

- `npm run lint`, `npm run typecheck`, and `npm run build` passed.
- `npm run test:browser` passed all 7 checks, including startup with JavaScript disabled, dashboard shortcuts, and no horizontal scrolling at 320, 390, 768, 1280, and 1440 px.
- The loopback session fixture verified pending, approved, and declined statuses, the approved team setup link, and reviewer-only queue access. It also checked that unrelated visitors receive no application status and that private notes stay off the dashboard.
- Inspected desktop and mobile screenshots. The generated Mumbai café photo uses responsive WebP files generated directly from the original at 640, 1080, and 1536 px. Image generation prompt: candid editorial photo of two adult friends laughing over coffee at a Bandra café, with tropical greenery and warm daylight.
- Live Szocial sign-in and database verification are pending. This change is local.

## Photo clarity follow-up

The original dashboard used a resized WebP that Next.js compressed again. The dashboard now serves the three sizes directly from static assets. Chrome loaded 640 px on a standard phone, 1080 px on a high-density phone, and the full 1536 px on a high-density laptop. Lint, type-check, build, and all 7 checks passed.
