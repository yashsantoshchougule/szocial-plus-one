import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { starterCookie } from "./starter-preference";

const steps = [
  {
    title: "Pick a Plus One",
    details: "Look for an approved team member who suits the outing you have in mind.",
  },
  {
    title: "Book by the hour",
    details: "Choose an available date, time, and duration. Review the total before you pay.",
  },
  {
    title: "Plan the meetup",
    details: "Once payment is confirmed, your private chat opens so you can agree on where to meet.",
  },
];

export default async function StarterPage({
  searchParams,
}: {
  searchParams: Promise<{ intro?: string | string[] }>;
}) {
  const [{ intro }, cookieStore] = await Promise.all([searchParams, cookies()]);
  if (intro !== "1" && cookieStore.get(starterCookie)?.value === "1") {
    redirect("/dashboard");
  }

  return (
    <>
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
        <section aria-labelledby="starter-title">
          <h1
            id="starter-title"
            className="max-w-lg text-4xl leading-[1.08] font-bold tracking-[-0.045em] md:text-6xl"
          >
            Find a Plus One
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Book an approved Szocial team member by the hour for a platonic
            outing, whether it’s a coffee, a day out, or an event.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <form action="/plus-one/start" method="post" className="w-full sm:w-auto">
              <button
                type="submit"
                className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-5 font-semibold text-white hover:bg-ink"
              >
                Explore Plus One
              </button>
            </form>
            <Link
              href="/apply"
              className="flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent"
            >
              Become a Team Member
            </Link>
          </div>
        </section>
        <section
          aria-labelledby="booking-steps"
          className="rounded-3xl bg-ink p-6 text-white sm:p-8"
        >
          <h2 id="booking-steps" className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-2 divide-y divide-white/15">
            {steps.map(({ title, details }, index) => (
              <li key={title} className="flex gap-4 py-4 last:pb-0">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-white/85">{details}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section
        id="team-members"
        aria-labelledby="team-members-title"
        className="mt-12 scroll-mt-8 border-t border-accent/15 pt-7"
      >
        <h2 id="team-members-title" className="text-xl font-semibold">
          Become a Team Member
        </h2>
        <p className="mt-2 max-w-xl leading-relaxed text-muted">
          Interested in hosting outings? Szocial reviews team member
          applications before a member can publish a profile or accept bookings.
        </p>
      </section>
    </>
  );
}
