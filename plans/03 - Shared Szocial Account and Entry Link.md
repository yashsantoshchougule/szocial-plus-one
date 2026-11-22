# Shared Szocial Account and Entry Link

**Task PO-03 · Must Fix · Planned**  
Depends on PO-01 and PO-02 for the staging scaffold. Owners: Szocial Auth and deployment engineering.

## Baseline and contract

Szocial main at `cc0cd335` uses a browser-local resident login. Branch `feature/szocial-supabase-auth-storage` at `1c34f03c` adds Supabase SSR, PKCE callbacks, resident account status, role records, middleware, and an auth/browser test suite. Its handoff describes isolated tests and external verification still required for hosted Auth, OAuth, Storage and payments. The implementation anchor is main with the reviewed Auth work integrated. [Resident auth baseline](https://github.com/vishv-tech/Szocial/blob/cc0cd335b21641806e3b82621878ca79d2814133/lib/resident-auth.ts) · [Feature branch handoff](https://github.com/vishv-tech/Szocial/blob/1c34f03c11cf992d97a1c7008e6a22d336211859/docs/supabase-delivery.md)

Both apps use the verified Supabase user ID and Szocial active account status. Szocial handles login and onboarding. Use verified recovery or explicit onboarding for legacy local accounts. Preserve only user-authorized, redacted legacy exports when applicable. A browser storage flag never grants access.

## Deployment and navigation

1. Configure the Szocial public host to route `/plus-one` and its descendants to the separate Plus One deployment with the prefix preserved. Build Plus One with `basePath` set to `/plus-one`. Verify assets, images, direct links, API requests and the provider webhook at the canonical host.
2. Use consistent SSR cookie names, project configuration, compatible options and host scope. Verify `Set-Cookie` forwarding. Give Plus One the verification and refresh responsibility for its route namespace. Apply private, no-store caching wherever responses depend on the session.
3. Add a **Plus One** link to signed-in resident Home on phone and desktop. Link to `/plus-one`. A first visit shows the starter. Subsequent visits use the directory. Direct valid deep links bypass the starter.
4. Use Szocial `/login` for an expired or missing session. Accept `returnTo` only for normalized internal Plus One paths. Reject external origins, scheme-relative URLs, encoded variants and unreadable paths. Carry an accepted destination through the configured sign-in, confirmation and onboarding steps. For invalid paths, use Szocial's normal login result.
5. Configure *staging separately* with dedicated Supabase and provider settings. Preserve the same origin scheme as production. Restrict or redirect the backing deployment hostname to the canonical origin. Keep the link behind a rollout flag until the live release gate passes.

## Implementation task

1. Review the branch diff and migrations. Re-run its lint, type, build and auth tests. Record upstream differences and dependencies before integrating the Auth work through the project's review flow.
2. Verify active, disabled and ordinary accounts against trusted server reads. Extend the existing login destination logic to preserve an allowed Plus One path through configured auth flows. Use the verified role table for reviewer and support permission checks.
3. Prove sessions across both deployed applications with isolated staging accounts. Add failure states for Auth outages, missing profile data and cancelled login. Preserve the pending destination when retrying a recoverable sign-in failure.
4. Verify sign-out via Szocial from both apps and reload a protected Plus One page. An authenticated participant may resume through a safe deep link after signing in again.

**Acceptance:** the same account ID persists across both apps, active residents reach Plus One in one click, legacy flags cannot grant access, signed-out visits land at the intended route after login, and sign-out or account disablement denies future protected reads. Existing Szocial resident, business and admin flows pass their staging baseline.

[Supabase sessions](https://supabase.com/docs/guides/auth/sessions) · [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) · [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
