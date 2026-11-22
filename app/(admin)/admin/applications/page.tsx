import Link from "next/link";
import { RouteState } from "@/components/route-state";
import { ApplicationAccess } from "@/features/applications/details";
import { applicationSession, reviewQueue, statusLabel } from "@/features/applications/data";
import { isApplicationId } from "@/features/applications/form";

export const metadata = { title: "Application queue" };

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; after?: string }>;
}) {
  const session = await applicationSession(true);
  const heading = <h1 className="mb-5 text-3xl font-bold tracking-tight md:text-4xl">Application queue</h1>;
  if (session.kind !== "ready") return <>{heading}<ApplicationAccess kind={session.kind} /></>;

  const params = await searchParams;
  const reviewed = params.view === "reviewed";
  const view = reviewed ? "reviewed" : "pending";
  const name = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const [afterTime, afterId] = (typeof params.after === "string" ? params.after : "").split(",");
  const validTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(afterTime)
    && Number.isFinite(Date.parse(afterTime));
  const cursor: [string, string] | null = validTime && afterId && isApplicationId(afterId) ? [afterTime, afterId] : null;
  const { rows: results, error } = await reviewQueue(session, reviewed, name, cursor);
  if (error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;
  const rows = results.slice(0, 20);
  const last = rows.at(-1);
  const nextQuery = last && results.length > 20
    ? new URLSearchParams({ view, q: name, after: `${last.submitted_at},${last.id}` }).toString()
    : null;

  return (
    <>
      {heading}
      <nav aria-label="Review status" className="mb-4 flex gap-4">
        <Link aria-current={!reviewed ? "page" : undefined} href="/admin/applications" className="font-semibold text-accent underline">Pending</Link>
        <Link aria-current={reviewed ? "page" : undefined} href="/admin/applications?view=reviewed" className="font-semibold text-accent underline">Reviewed</Link>
      </nav>
      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="view" value={view} />
        <label className="font-semibold">
          Applicant name
          <input name="q" defaultValue={name} maxLength={100} className="mt-1 block min-h-11 rounded-lg border border-accent/25 bg-white px-3" />
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Search</button>
      </form>
      {rows.length ? (
        <ul className="max-w-2xl space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/applications/${row.id}`} className="flex flex-wrap justify-between gap-2 rounded-xl border border-accent/15 bg-white px-4 py-3 hover:border-accent">
                <span><strong>{row.display_name}</strong><span className="block text-sm text-muted">{row.area}</span></span>
                <span className="text-sm font-semibold text-accent">{statusLabel[row.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <RouteState title="No matching applications" description="Try a different search or review status." />
      )}
      {nextQuery && <Link className="mt-5 inline-block font-semibold text-accent underline" href={`/admin/applications?${nextQuery}`}>Next page</Link>}
    </>
  );
}
