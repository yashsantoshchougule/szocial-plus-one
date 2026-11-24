import Link from "next/link";
import { RouteState } from "@/components/route-state";
import { applicationSession, ownApplication, statusLabel } from "@/features/applications/data";
import { ApplicationAccess, ApplicationDetails } from "@/features/applications/details";

export const metadata = { title: "Application status" };

const statusCopy = {
  pending: "A Plus One reviewer will manually check your application and background. You can come back here for updates.",
  approved: "You can continue to team profile setup.",
  declined: "Your team member application was declined. You can still use your Szocial account.",
};

export default async function ApplicationStatusPage() {
  const session = await applicationSession();
  const heading = <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Application status</h1>;
  if (session.kind !== "ready") return <>{heading}<ApplicationAccess kind={session.kind} /></>;

  const { data, error } = await ownApplication(session);
  if (error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;

  return (
    <>
      {heading}
      {data ? (
        <RouteState title={statusLabel[data.status]} description={statusCopy[data.status]}>
          {data.status === "approved" && (
            <Link href="/team/setup" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-white">Continue setup</Link>
          )}
          <ApplicationDetails application={data} />
        </RouteState>
      ) : (
        <RouteState title="No application yet" description="Apply with your Szocial account to become a team member.">
          <Link href="/apply" className="font-semibold text-accent underline">Become a Team Member</Link>
        </RouteState>
      )}
      <Link href="/discover" className="mt-5 inline-flex min-h-11 items-center font-semibold text-accent underline">Back to Discover</Link>
    </>
  );
}
