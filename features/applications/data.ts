import "server-only";
import { sharedSession, type SharedAccount } from "@/lib/server-session";
import { accountQuery } from "@/lib/plus-one-db";

export type ApplicationStatus = "pending" | "approved" | "declined";

export type TeamApplication = {
  id: string;
  applicant_id: string;
  display_name: string;
  area: string;
  languages: string;
  introduction: string;
  activities: string;
  adult_attested: boolean;
  status: ApplicationStatus;
  submitted_at: string;
};

export type ReviewRecord = {
  decision: Exclude<ApplicationStatus, "pending">;
  reason: string;
  eligibility_verified: boolean;
  background_verified: boolean;
  reviewed_at: string;
};

export const statusLabel = {
  pending: "Pending review",
  approved: "Approved",
  declined: "Declined",
} satisfies Record<ApplicationStatus, string>;

export async function applicationSession(reviewer = false) {
  const account = await sharedSession();
  if (account.kind !== "ready" || !reviewer) return account;
  const { data, error } = await reviewerAssignment(account);
  if (error) return { kind: "unavailable" } as const;
  return data ? account : { kind: "forbidden" } as const;
}

type ReadySession = SharedAccount;

export async function reviewerAssignment({ userId }: ReadySession) {
  const { rows, error } = await accountQuery<{ role: "reviewer" }>(userId,
    "select role from plus_one.staff_roles where user_id = $1 and role = 'reviewer'", [userId]);
  return { data: rows[0], error };
}

const applicationColumns = "id, applicant_id, display_name, area, languages, introduction, activities, adult_attested, status, submitted_at::text";

export async function ownApplication({ userId }: ReadySession) {
  const { rows, error } = await accountQuery<TeamApplication>(userId,
    "select " + applicationColumns + " from plus_one.team_member_applications where applicant_id = $1", [userId]);
  return { data: rows[0], error };
}

export async function applicationStatus({ userId }: ReadySession) {
  const { rows, error } = await accountQuery<{ status: ApplicationStatus }>(userId,
    "select status from plus_one.team_member_applications where applicant_id = $1", [userId]);
  return { data: rows[0], error };
}

export async function reviewedApplication({ userId }: ReadySession, id: string) {
  const { rows, error } = await accountQuery<TeamApplication>(userId,
    "select " + applicationColumns + " from plus_one.team_member_applications where id = $1", [id]);
  return { data: rows[0], error };
}

export async function privateReview({ userId }: ReadySession, id: string) {
  const { rows, error } = await accountQuery<ReviewRecord>(userId,
    "select decision, reason, eligibility_verified, background_verified, reviewed_at::text from plus_one.application_reviews where application_id = $1", [id]);
  return { data: rows[0], error };
}

type QueueRow = Pick<TeamApplication, "id" | "display_name" | "area" | "status" | "submitted_at">;

export function reviewQueue({ userId }: ReadySession, reviewed: boolean, name: string, cursor: [string, string] | null) {
  const direction = reviewed ? "desc" : "asc";
  const comparison = reviewed ? "<" : ">";
  const statuses = reviewed ? ["approved", "declined"] : ["pending"];
  return accountQuery<QueueRow>(userId, `
    select id, display_name, area, status,
      to_char(submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as submitted_at
    from plus_one.team_member_applications as a
    where status = any($1::text[]) and ($2::text is null or display_name ilike $2)
      and ($3::timestamptz is null or (a.submitted_at, id) ${comparison} ($3::timestamptz, $4::uuid))
    order by a.submitted_at ${direction}, id ${direction} limit 21
  `, [statuses, name ? "%" + name.replace(/[\\%_]/g, "\\$&") + "%" : null, cursor?.[0], cursor?.[1]]);
}
