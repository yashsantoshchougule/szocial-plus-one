import Link from "next/link";
import { applicationSession, applicationStatus, reviewerAssignment, statusLabel } from "./data";

const linkStyle = "inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4";

export async function TeamMemberPanel() {
  const session = await applicationSession();
  if (session.kind === "forbidden") {
    return <p className="mt-2 text-muted">Team membership is unavailable for this account.</p>;
  }

  if (session.kind !== "ready") {
    return (
      <>
        <p className="mt-2 leading-relaxed text-muted">Apply with your Szocial account to host paid, platonic outings.</p>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/apply" className={linkStyle}>Become a Team Member</Link>
          <Link href="/application" className={linkStyle}>Check application status</Link>
        </div>
      </>
    );
  }

  const [application, reviewer] = await Promise.all([
    applicationStatus(session),
    reviewerAssignment(session),
  ]);
  const status: unknown = application.data?.status;
  const validStatus = status === "pending" || status === "approved" || status === "declined" ? status : null;

  return (
    <>
      <p className="mt-2 leading-relaxed text-muted">
        {application.error ? "Application status is temporarily unavailable."
          : validStatus ? <>Application status <strong className="font-semibold text-ink">{statusLabel[validStatus]}</strong></>
          : "Apply to host paid, platonic outings."}
      </p>
      <div className="flex flex-wrap gap-x-4">
        {validStatus || application.error ? (
          <Link href="/application" className={linkStyle}>View application</Link>
        ) : (
          <Link href="/apply" className={linkStyle}>Become a Team Member</Link>
        )}
        {validStatus === "approved" && <Link href="/team/setup" className={linkStyle}>Continue team setup</Link>}
        {!reviewer.error && reviewer.data && <Link href="/admin/applications" className={linkStyle}>Review applications</Link>}
      </div>
    </>
  );
}
