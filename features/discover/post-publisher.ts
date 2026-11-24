import "server-only";
import { accountQuery } from "@/lib/plus-one-db";

export async function postableProfileId(userId: string) {
  const { rows } = await accountQuery<{ id: string | null }>(userId,
    "select plus_one.postable_profile_id() as id");
  return rows[0]?.id ?? null;
}

