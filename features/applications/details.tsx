import Link from "next/link";
import { RouteState } from "@/components/route-state";
import type { TeamApplication } from "./data";

export function ApplicationAccess({ kind }: { kind: "unavailable" | "signed-out" | "forbidden" }) {
  const title = {
    unavailable: "Applications are temporarily unavailable",
    "signed-out": "Sign in through Szocial",
    forbidden: "Access is unavailable for this account",
  }[kind];

  return (
    <RouteState
      title={title}
      description={kind === "unavailable"
        ? "Try again when the Plus One connection is available."
        : "Open Plus One through Szocial with an account that can access this page."}
    >
      <Link href="/discover" className="font-semibold text-accent underline">Back to Discover</Link>
    </RouteState>
  );
}

export function ApplicationDetails({ application }: { application: TeamApplication }) {
  const details = [
    ["Display name", application.display_name],
    ["City or general area", application.area],
    ["Languages", application.languages],
    ["Introduction", application.introduction],
    ["Preferred activities", application.activities],
    ["Adult eligibility", application.adult_attested ? "Confirmed by applicant" : "Unconfirmed"],
  ];

  return (
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      {details.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm font-semibold text-muted">{label}</dt>
          <dd className="mt-1 break-words whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
