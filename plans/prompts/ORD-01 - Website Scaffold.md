# ORD-01 — Website scaffold

**Priority** Must Fix  
**Source** Order 01 in the [master checklist](https://drive.google.com/open?id=1g_8ttQU772STbGoqJYybPJ4OWsETOUUw), with the Szocial Plus One product brief dated 20 November 2026.

## Implementation prompt

Make the standalone Szocial Plus One website runnable from this repository. Use the existing Next.js App Router project, Node 24, TypeScript, Tailwind, and npm. Serve the mobile-first starter at `/plus-one`, load its prefixed static assets, and retain the setup instructions, environment example, and basic health timing response. Keep the scaffold independent of Szocial sign-in and hosted services at this order.

**Dependencies** Node 24, the locked npm dependencies, and Chrome for the loopback production smoke test.

**Acceptance criteria**

- The production build succeeds, and lint and type-checking pass.
- Chrome at 390 px loads `/plus-one`, finds the starter heading, applies the stylesheet from `/plus-one/_next/`, and reports no page errors or failed requests.
- The unprefixed root returns 404. The prefixed health endpoint returns `{"status":"ok"}` and a `Server-Timing` header.

## Implementation plan

1. Review the existing route, layout, stylesheet, configuration, README, environment example, and production smoke test. The scaffold, scripts, and test already exist in the target folder.
2. Preserve the existing code where it matches the criteria. Run lint and type-checking, build, and then run the Chrome smoke test against the built website. Repair and rerun if verification finds an Order 01 regression.
3. Record the actual results here. Publish this single Markdown file to the existing Drive prompts folder and verify the saved copy.

The official Next.js documentation establishes the build-time path prefix and the production build and start commands. [Next.js base path](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) · [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next)

## Changes and verification

**Result** Already resolved. The existing scaffold met the Order 01 criteria. This run added the consolidated record and verified the current website code.

The starter is in `app/page.tsx`, the path prefix is in `next.config.ts`, and the health handler is in `app/api/health/route.ts`. The production smoke test lives in `tests/scaffold.test.mjs`.

| Command | Actual result |
|---|---|
| `npm run lint` | Passed with no reported errors. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed with Next.js 16.4.6. |
| `npm run test:browser` | 1 passed, 0 failed. Chrome at 390 × 844 opened `/plus-one` on the loopback production server. The starter heading and its prefixed stylesheet loaded with no failed browser requests or page errors. The unprefixed root returned 404. The health response returned the expected JSON and `Server-Timing` header. |

**Limits** This is local scaffold verification. Shared Szocial sign-in, hosted deployment, and load capacity have separate acceptance checks.
