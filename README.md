# Szocial Plus One

Plus One is the separate, mobile-first Next.js website for Szocial's hourly companion booking pilot.
Use Node.js 24 and npm. Copy `.env.example` to `.env.local` when setting up shared authentication.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open `http://127.0.0.1:3001/plus-one` to see the starter. **Explore Plus One** opens `/plus-one/dashboard`. The production build uses the same paths.

```sh
npm run lint
npm run typecheck
npm run build
npm run test:browser
```

The browser smoke test uses a production build and Chrome. Set `CHROMIUM_PATH` to the absolute browser executable if it is installed outside its default location.

## Shared Szocial integration

The integrated website expects the Main Szocial origin in `SZOCIAL_PUBLIC_ORIGIN`. Main routes `/plus-one` to this website, shares its host-scoped Supabase Auth cookies, and validates the `returnTo` path before sending a user back after login. Leave the origin blank for an isolated UI preview.

Use `PLUS_ONE_DATABASE_URL` exclusively on the server for the dedicated `plus_one_runtime` login. Provision its password outside the repository after the migrations and effective-grant preflight pass in staging. Keep the `plus_one` schema outside the Supabase Data API. See the [Order 02 record](plans/prompts/ORD-02%20-%20Shared%20Szocial%20Account.md) for the remaining integration gates.
