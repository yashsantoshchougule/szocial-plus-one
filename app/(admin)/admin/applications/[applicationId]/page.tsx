import Link from "next/link";
import { notFound } from "next/navigation";
import { applicationSession, privateReview, reviewedApplication, statusLabel } from "@/features/applications/data";
import { ApplicationAccess, ApplicationDetails } from "@/features/applications/details";
import { ReviewForm } from "@/features/applications/forms";
import { isApplicationId } from "@/features/applications/form";

export const metadata = { title: "Review application" };

export default async function ReviewDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const session = await applicationSession(true);
  const heading = <h1 className="mb-5 text-3xl font-bold tracking-tight md:text-4xl">Review application</h1>;
  if (session.kind !== "ready") return <>{heading}<ApplicationAccess kind={session.kind} /></>;

  const { applicationId } = await params;
  if (!isApplicationId(applicationId)) notFound();

  const { data, error } = await reviewedApplication(session, applicationId);
  if (error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;
  if (!data) notFound();

  const review = data.status === "pending" ? null : await privateReview(session, data.id);
  if (review?.error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;

  return (
    <>
      <Link href="/admin/applications" className="mb-3 inline-block font-semibold text-accent underline">Back to queue</Link>
      {heading}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-accent/15 bg-white p-5">
          <h2 className="text-xl font-semibold">Submitted details</h2>
          <ApplicationDetails application={data} />
        </section>
        <section className="rounded-2xl border border-accent/15 bg-white p-5">
          <h2 className="text-xl font-semibold">{statusLabel[data.status]}</h2>
          {data.status === "pending" && data.applicant_id !== session.userId && <ReviewForm id={data.id} />}
          {data.status === "pending" && data.applicant_id === session.userId && <p className="mt-3">Another reviewer must decide your application.</p>}
          {review?.data && (
            <dl className="mt-4 space-y-3">
              <div><dt className="font-semibold">Private reason</dt><dd className="break-words whitespace-pre-wrap">{review.data.reason}</dd></div>
              <div><dt className="font-semibold">Manual background verification</dt><dd>{review.data.background_verified ? "Confirmed" : "Not confirmed"}</dd></div>
              <div><dt className="font-semibold">Recorded</dt><dd><time dateTime={review.data.reviewed_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(review.data.reviewed_at))} IST</time></dd></div>
            </dl>
          )}
        </section>
      </div>
    </>
  );
}
