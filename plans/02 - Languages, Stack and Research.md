# Languages, Stack and Research

**Task PO-02 · Must Fix · Planned**  
Output: a source-backed stack decision, dependency lock and staging spike checklist.

## Stack

| Layer | Decision | Reason and implementation check |
|---|---|---|
| Application language | TypeScript in strict mode | Fits the Szocial ecosystem. Model role, booking, payment, and application states as typed contracts. Validate every external request at runtime. |
| Runtime and package tools | Node.js 24 LTS and npm | The auth feature branch was exercised on Node 24 according to its handoff. Pin the approved Node 24 patch in development and CI. Use npm lockfiles and `npm ci`. |
| Web framework | Next.js App Router with React | Szocial main uses Next.js 15 and React 19. Start the new repo on a supported patched Next.js 16 release with its compatible React 19 versions. Keep the existing Szocial framework upgrade independent. |
| Styling | Tailwind CSS and CSS variables | Familiar to the team. Define a small theme for colors, radii, spacing, focus and type. Reuse patterns from Szocial's mobile shell and desktop navigation. |
| Data and identity | Supabase Auth + PostgreSQL + Storage | One verified account ID across products. Use SQL for migrations, ownership and integrity. Use private storage and short-lived authorized media access. |
| Messaging updates | Supabase Realtime | Observe membership-protected message updates after the thread loads. Fetch persisted history on reconnect or focus. |
| Checkout | Razorpay Standard Checkout | Use INR, server-created orders, verified captures, signed webhooks and reconciliation. Use the official hosted checkout to handle payment instruments. |
| Tests | Node test runner, isolated PostgreSQL/Supabase and Playwright | Use actual PostgreSQL for range overlap and concurrency. Browser testing covers small screens, cross-app auth, and the payment-to-chat workflow. |

Pin exact package and CLI versions after verifying hosting support, lockfile, auth cookie compatibility, and staging build. Use separate test and live provider credentials supplied through deployment secrets.

## Product and UX research

| Source | Evidence to apply |
|---|---|
| [RentAFriend](https://support.rentafriend.com/article/330-how-does-rent-a-friend-work) | Location-led browsing with visible photos, profiles and interests. Plus One's gate is an individual paid booking. |
| [Airbnb Experiences calendar](https://www.airbnb.com/help/article/2645) | Publish times from a host calendar and show date-based availability. For Plus One, show the reason a slot is blocked without exposing booking details. |
| [Airbnb identity verification](https://www.airbnb.com/help/article/1237) | Describe verification and use approval states. Operations validates eligibility through an approved process before releasing profiles. |
| [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) | Start payment from a clearly priced booking and recover the booking state after checkout. |
| [Instagram Restrict](https://about.fb.com/news/2019/10/empowering-our-community-to-stand-up-to-bullying/) | Quiet and privately move a conversation while preserving the booking context. |
| [Bumble BFF meeting guidance](https://bumble.com/bff/friendship/safe-online-friends) | Show public first-meeting guidance near the booking and first conversation. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Use visible focus, readable contrast, explicit status and responsive reflow. Test keyboard and assistive feedback around slot selection. |

The supplied brief describes a photo reference. Wireframes use that description and the product references above as their basis. Rates and policies in the plans are pilot assumptions, with examples used for design and tests.

## Implementation task

1. Pin the supported runtime, framework, Supabase SDK and CLI versions. Record versions and upgrade notes in the repo.
2. Verify an independently built app at `/plus-one` including images, protected pages and API routes. Confirm cookie compatibility with the auth branch in a test environment.
3. Verify PostgreSQL range and extension support on the target Supabase version. Confirm data API exposure settings, permissions, plus role and storage behavior in staging.
4. Verify Razorpay test-mode order, webhook and refund behavior. Have operations confirm product eligibility, pricing disclosure and settlement setup before live use.

**Acceptance:** record tested versions, host and auth routing evidence, test-mode provider evidence, and approved technical decisions. The signed-in flow must build and run across both repositories.

[Node release support](https://nodejs.org/en/about/previous-releases) · [Next.js 16](https://nextjs.org/blog/next-16) · [Supabase changelog](https://supabase.com/changelog.md) · [Szocial package manifest](https://github.com/vishv-tech/Szocial/blob/cc0cd335b21641806e3b82621878ca79d2814133/package.json)
