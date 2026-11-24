import "server-only";
import { createClient } from "@supabase/supabase-js";
import { plusOneProjectUrl } from "./project-config";
import { mainAuthProjectUrl } from "./shared-auth";

export function dataProject() {
  return plusOneProjectUrl(process.env.PLUS_ONE_SUPABASE_URL, mainAuthProjectUrl());
}

export function plusOneStorage() {
  const project = dataProject();
  const secret = process.env.PLUS_ONE_SUPABASE_SECRET_KEY;
  if (!project || !secret) return null;
  return createClient(project.origin, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000), redirect: "error" }),
    },
  }).storage;
}
