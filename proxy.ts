import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, verifySharedAccount } from "@/lib/shared-auth";
import { szocialLoginUrl } from "@/lib/login-destination";

const cacheControl = "private, no-store";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", cacheControl);

  const origin = process.env.SZOCIAL_PUBLIC_ORIGIN;
  if (!origin) return response;

  const auth = authConfig();
  if (!auth) return new NextResponse("Plus One sign-in is temporarily unavailable.", {
    status: 503, headers: { "Cache-Control": cacheControl },
  });

  const client = createServerClient(auth.url, auth.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries, headers) => {
        for (const { name, value } of entries) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of entries) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
        response.headers.set("Cache-Control", cacheControl);
      },
    },
  });
  const account = await verifySharedAccount(client);
  if (account.kind === "ready") return response;

  const headers = { "Cache-Control": cacheControl };
  let denied;
  if (account.kind === "signed-out" && (request.method === "GET" || request.method === "HEAD")) {
    denied = NextResponse.redirect(szocialLoginUrl(origin, new URL(request.url).pathname), { headers });
  } else {
    const status = { "signed-out": 401, forbidden: 403, unavailable: 503 }[account.kind];
    denied = new NextResponse("Plus One access is unavailable. Open Plus One through Szocial.", { status, headers });
  }
  for (const cookie of response.cookies.getAll()) denied.cookies.set(cookie);
  return denied;
}

export const config = {
  matcher: ["/", "/start", "/dashboard", "/discover", "/members/:path*", "/bookings/:path*", "/chats/:path*", "/apply",
    "/application", "/team/:path*", "/admin/:path*"],
};
