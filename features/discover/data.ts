import "server-only";
import { accountQuery } from "@/lib/plus-one-db";
import { plusOneStorage } from "@/lib/plus-one-project";
import type { SharedAccount } from "@/lib/server-session";
import type { DiscoverFilters } from "./filters";

type Listing = {
  id: string;
  display_name: string;
  area: string;
  activities: string[];
  hourly_rate_paise: number;
  busy: boolean;
};

type DirectoryRow = Listing & { cover_key: string; published_at: string };
type MemberRow = Listing & { cover_key: string; bio: string; languages: string[] };
export type DirectoryCard = Listing & { photoUrl?: string };

export const discoverCoverBucket = "plus-one-discover-covers";
const pageSize = 12;
const cardFields = "id, display_name, area, activities, hourly_rate_paise, busy, cover_key";

export async function signCovers(keys: string[]) {
  const storage = keys.length ? plusOneStorage() : null;
  if (!storage) return new Map<string, string>();
  const { data } = await storage.from(discoverCoverBucket).createSignedUrls(keys, 120);
  return new Map((data ?? []).flatMap(({ path, signedUrl }) => path && signedUrl ? [[path, signedUrl]] : []));
}

export async function findMembers(account: SharedAccount, filters: DiscoverFilters) {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filters.area) {
    values.push(filters.area);
    conditions.push("lower(area) = lower($" + values.length + ")");
  }
  if (filters.activity) {
    values.push(filters.activity);
    conditions.push("activities @> array[$" + values.length + "::text]");
  }
  if (filters.after) {
    const dateIndex = values.push(filters.after[0]);
    const idIndex = values.push(filters.after[1]);
    conditions.push("(published_at, id) < ($" + dateIndex + "::timestamptz, $" + idIndex + "::uuid)");
  }

  const { rows, error } = await accountQuery<DirectoryRow>(account.userId, `
    select ${cardFields},
      to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as published_at
    from plus_one.discover_members
    ${conditions.length ? "where " + conditions.join(" and ") : ""}
    order by discover_members.published_at desc, id desc
    limit ${pageSize + 1}
  `, values);
  if (error) return { cards: [], next: null, error };

  const page = rows.slice(0, pageSize);
  const covers = await signCovers(page.map(({ cover_key }) => cover_key));
  const cards: DirectoryCard[] = page.map((row) => ({
    id: row.id, display_name: row.display_name, area: row.area, activities: row.activities,
    hourly_rate_paise: row.hourly_rate_paise, busy: row.busy, photoUrl: covers.get(row.cover_key),
  }));
  const last = page.at(-1);
  const next = last && rows.length > pageSize ? last.published_at + "," + last.id : null;
  return { cards, next, error };
}

export async function findMember(account: SharedAccount, memberId: string) {
  const { rows, error } = await accountQuery<MemberRow>(account.userId, `
    select ${cardFields}, bio, languages from plus_one.discover_members where id = $1
  `, [memberId]);
  const member = rows[0];
  if (!member) return { member: null, error };

  const { cover_key, ...profile } = member;
  const covers = await signCovers([cover_key]);
  return { member: { ...profile, photoUrl: covers.get(cover_key) }, error };
}
