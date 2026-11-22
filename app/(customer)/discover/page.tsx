import type { CSSProperties } from "react";
import Form from "next/form";
import Link from "next/link";
import { PlusOneIcon } from "@/components/plus-one-icon";
import { sharedSession } from "@/lib/server-session";
import { authConfig } from "@/lib/shared-auth";
import { findMembers } from "@/features/discover/data";
import { discoverDemoEnabled, findDemoMembers } from "@/features/discover/demo";
import { ActivitySelect } from "@/features/discover/activity-select";
import { AreaSelect } from "@/features/discover/area-select";
import { discoverHref, readFilters } from "@/features/discover/filters";
import { MemberCard } from "@/features/discover/member-card";
import mumbai from "@/public/discover/kala-ghoda.webp";
import mumbaiSmall from "@/public/discover/kala-ghoda-640.webp";
import mumbaiContinuation from "@/public/discover/kala-ghoda-continuation.webp";

export const metadata = { title: "Discover" };

const inputClass = "mt-1.5 min-h-12 w-full rounded-xl border border-[#cedacf] bg-white px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-accent";
const textLink = "inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readFilters(await searchParams);
  const filtered = Boolean(filters.area || filters.activity);
  const session = await sharedSession();
  const directory = session.kind === "ready" ? await findMembers(session, filters) : null;
  const preview = session.kind === "unavailable" && !authConfig() && !process.env.SZOCIAL_PUBLIC_ORIGIN;
  const signedInOrPreview = session.kind === "ready" || preview;
  const demoMode = preview && discoverDemoEnabled();
  const cards = demoMode ? findDemoMembers(filters) : directory?.cards ?? [];

  return (
    <div className="-mt-4 space-y-6 md:-mt-8 md:space-y-8">
      <section className="isolate grid overflow-hidden rounded-3xl bg-[#e9efe0] md:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10 px-6 py-6 sm:px-10 sm:py-8 lg:px-12 lg:py-10">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <PlusOneIcon name="location" className="size-4" /> Mumbai
          </p>
          <h1 className="mt-2 font-serif text-[clamp(2.75rem,6vw,4.5rem)] leading-none tracking-[-0.045em]">Discover</h1>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">Find a Plus One for coffee, a city outing, or your next event.</p>
          <Link href="/apply" className={`${textLink} mt-2`}>Become a Team Member</Link>
        </div>
        <div className="discover-photo-frame relative aspect-[3/1] md:aspect-auto">
          <div
            aria-hidden="true"
            data-discover-photo-blend
            className="discover-photo-scene"
            style={{ "--discover-continuation": `url(${mumbaiContinuation.src})` } as CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Responsive WebPs are encoded from the original. */}
            <img
              src={mumbai.src}
              srcSet={mumbaiSmall.src + " " + mumbaiSmall.width + "w, " + mumbai.src + " " + mumbai.width + "w"}
              sizes="(max-width: 767px) 94vw, (max-width: 1152px) 47vw, 520px"
              width={mumbai.width}
              height={mumbai.height}
              alt=""
              fetchPriority="high"
              className="discover-photo-sharp"
            />
            <div className="discover-photo-blur discover-photo-blur--wide" />
            <div className="discover-photo-blur discover-photo-blur--medium" />
            <div className="discover-photo-blur discover-photo-blur--light" />
          </div>
        </div>
      </section>

      <Form aria-label="Filter team members" action="/discover" scroll={false} prefetch={false}
        className="grid gap-4 rounded-2xl border border-[#d9e2d7] bg-white p-4 min-[360px]:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <AreaSelect key={filters.area} value={filters.area} className={inputClass} />
        <div className="min-w-0">
          <label htmlFor="discover-activity" className="text-sm font-semibold">Activity</label>
          <ActivitySelect key={filters.activity} value={filters.activity} className={inputClass} />
        </div>
        <div className="flex flex-wrap items-center gap-3 min-[360px]:col-span-2 lg:col-span-1">
          <button type="submit" className="min-h-12 grow rounded-xl bg-accent px-5 font-semibold text-white hover:bg-ink sm:grow-0">
            Find team members
          </button>
          {filtered && <Link href="/discover" scroll={false} className={textLink}>Clear filters</Link>}
        </div>
      </Form>

      <section aria-labelledby="discover-results">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="discover-results" className="text-xl font-bold tracking-tight sm:text-2xl">Team members</h2>
          {demoMode && <p className="text-sm font-medium text-muted">Demo profiles</p>}
        </div>
        {!signedInOrPreview || directory?.error ? (
          <div className="rounded-2xl border border-[#d9e2d7] bg-white p-6">
            <h3 className="text-lg font-semibold">
              {session.kind === "signed-out" ? "Sign in through Szocial"
                : session.kind === "forbidden" ? "Discover is unavailable for this account"
                  : "Discover is temporarily unavailable"}
            </h3>
            <p className="mt-1 text-muted">
              {session.kind === "signed-out" ? "Open Plus One from your Szocial account to see the directory." : "You can return to your dashboard or try this page again."}
            </p>
            <a href={"/plus-one" + discoverHref(filters, filters.after?.join(","))} className={textLink}>Try again</a>
          </div>
        ) : cards.length ? (
          <>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((member) => <li key={member.id} className="min-w-0"><MemberCard member={member} /></li>)}
            </ul>
            {(directory?.next || filters.after) && (
              <nav aria-label="Directory pages" className="mt-5 flex flex-wrap gap-5">
                {filters.after && <Link href={discoverHref(filters)} prefetch={false} className={textLink}>First page</Link>}
                {directory?.next && <Link href={discoverHref(filters, directory.next)} prefetch={false}
                  className="inline-flex min-h-12 items-center rounded-xl border border-accent/25 bg-white px-4 font-semibold text-accent hover:bg-accent/5">Next page</Link>}
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-[#d9e2d7] bg-white px-5 py-8 text-center sm:py-10">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-[#e6efe2] text-accent">
              <PlusOneIcon name="discover" className="size-6" />
            </span>
            <h3 className="text-lg font-semibold">
              {filters.after ? "No more team members" : filtered ? "No matches for these filters" : "No bookable team members yet"}
            </h3>
            <p className="mt-1.5 text-muted">
              {filters.after ? "Go back to the first page to see the latest results."
                : filtered ? "Try another area or activity." : "Approved team members will appear here when they are accepting bookings."}
            </p>
            <Link className={`${textLink} mt-1`}
              href={filters.after ? discoverHref(filters) : filtered ? "/discover" : "/?intro=1"}
              scroll={Boolean(filters.after) || !filtered}>
              {filters.after ? "First page" : filtered ? "Clear directory filters" : "How Plus One works"}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
