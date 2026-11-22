import { redirect } from "next/navigation";
import { RouteState } from "@/components/route-state";
import { applicationSession, ownApplication } from "@/features/applications/data";
import { ApplicationAccess } from "@/features/applications/details";
import { ApplicationForm } from "@/features/applications/forms";

export const metadata = { title: "Become a Team Member" };

export default async function ApplyPage() {
  const session = await applicationSession();
  if (session.kind !== "ready") {
    return <><h1 className="mb-5 text-3xl font-bold">Become a Team Member</h1><ApplicationAccess kind={session.kind} /></>;
  }
  const { data, error } = await ownApplication(session);
  if (data) redirect("/application");

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Become a Team Member</h1>
      {error ? (
        <div className="mt-5"><ApplicationAccess kind="unavailable" /></div>
      ) : (
        <div className="mt-6 grid gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-label="Team member application" className="rounded-2xl border border-accent/15 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Tell us about yourself</h2>
            <ApplicationForm />
          </section>
          <aside>
            <RouteState title="How review works" description="Your application is private to you and authorized Szocial reviewers. You can check its status on this website. Approval unlocks team profile setup." />
          </aside>
        </div>
      )}
    </>
  );
}
