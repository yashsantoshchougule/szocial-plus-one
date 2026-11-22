import { createServerClient } from "@supabase/ssr";

export function authConfig() {
  const url = Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_URL");
  const key = Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return typeof url === "string" && url && typeof key === "string" && key ? { url, key } : null;
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
