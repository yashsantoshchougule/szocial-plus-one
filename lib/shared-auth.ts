import { createServerClient } from "@supabase/ssr";
import { supabaseProjectUrl } from "./project-config";

export function mainAuthProjectUrl() {
  // The old variables are accepted only for Main Auth while deployments switch names.
  return supabaseProjectUrl(process.env.SZOCIAL_AUTH_URL ?? Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_URL"));
}

export function authConfig() {
  const url = mainAuthProjectUrl();
  const key = process.env.SZOCIAL_AUTH_PUBLISHABLE_KEY ?? Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return url && typeof key === "string" && key ? { url: url.origin, key } : null;
}

export async function verifySharedAccount(client: ReturnType<typeof createServerClient>) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)) {
    return { kind: "unavailable" } as const;
  }
  if (error || !user || user.is_anonymous) return { kind: "signed-out" } as const;
  if (user.banned_until && Date.parse(user.banned_until) > Date.now()) {
    return { kind: "forbidden" } as const;
  }
  return { kind: "ready", userId: user.id } as const;
}
