import "server-only";

import { accountQuery } from "@/lib/plus-one-db";
import type { SharedAccount } from "@/lib/server-session";

export type OwnTeamProfile = {
  id: string;
  display_name: string;
  area: string;
  bio: string;
  languages: string[];
  activities: string[];
  hourly_rate_paise: number | null;
  cover_key: string | null;
  published_at: string | null;
  accepting_bookings: boolean;
};

export async function readTeamSetup(account: SharedAccount) {
  const { rows, error } = await accountQuery<{ allowed: boolean; profile: OwnTeamProfile | null }>(account.userId, `
    select plus_one.can_set_up_team_profile() as allowed,
      (select to_jsonb(profile) from plus_one.own_team_profile() as profile) as profile
  `);
  return { setup: rows[0], error };
}
