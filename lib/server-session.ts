import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig, verifySharedAccount } from "./shared-auth";

export async function sharedSession() {
  const cookieStore = await cookies();
  const config = authConfig();
  if (!config) return { kind: "unavailable" } as const;

  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          for (const { name, value, options } of entries) cookieStore.set(name, value, options);
        } catch {
          // Proxy refreshes cookies for shared-origin requests.
        }
      },
    },
  });

  const account = await verifySharedAccount(client);
  return account.kind === "ready" ? { ...account, client } : account;
}

export type SharedAccount = Extract<Awaited<ReturnType<typeof sharedSession>>, { kind: "ready" }>;
