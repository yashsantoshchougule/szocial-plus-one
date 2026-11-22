import Link from "next/link";
import { redirect } from "next/navigation";
import { RouteState } from "@/components/route-state";
import { ApplicationAccess } from "@/features/applications/details";
import { applicationSession, ownApplication } from "@/features/applications/data";

export const metadata = { title: "Team profile setup" };

export default async function TeamSetupPage() {
  const session = await applicationSession();
  const heading = <h1 className="mb-6 text-3xl font-bold tracking-tight">Team profile setup</h1>;
  if (session.kind !== "ready") return <>{heading}<ApplicationAccess kind={session.kind} /></>;

  const { data, error } = await ownApplication(session);
  if (error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;
  if (data?.status !== "approved") redirect("/application");

  return (
    <>
      {heading}
      <RouteState title="Your application is approved" description="You have access to team setup. Profile editing is not available yet.">
        <Link href="/application" className="font-semibold text-accent underline">View application status</Link>
      </RouteState>
    </>
  );
}
