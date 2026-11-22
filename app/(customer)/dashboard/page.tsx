import Link from "next/link";
import { Suspense } from "react";
import { PlusOneIcon } from "@/components/plus-one-icon";
import { TeamMemberPanel } from "@/features/applications/team-member-panel";
import cafePhoto from "@/public/dashboard/mumbai-cafe.webp";
import cafePhotoMedium from "@/public/dashboard/mumbai-cafe-1080.webp";
import cafePhotoSmall from "@/public/dashboard/mumbai-cafe-640.webp";

const cafePhotoSet = [cafePhotoSmall, cafePhotoMedium, cafePhoto]
  .map(({ src, width }) => src + " " + width + "w").join(", ");

export const metadata = { title: "Dashboard" };

const shortcuts = [
  { title: "Discover", href: "/discover", icon: "discover", description: "Explore team members for coffee, outings, and events." },
  { title: "Bookings", href: "/bookings", icon: "bookings", description: "Find your upcoming plans and past bookings." },
  { title: "Private chats", href: "/chats", icon: "chats", description: "Make plans together once your booking is paid." },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8 sm:space-y-10 md:-mt-8">
      <section aria-labelledby="dashboard-title" className="grid overflow-hidden rounded-3xl bg-[#153c32] text-white md:grid-cols-[1fr_0.98fr]">
        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#d1e3a6]">
            <PlusOneIcon name="location" className="size-4" /> Mumbai
          </p>
          <h1 id="dashboard-title" className="mt-3 max-w-[12ch] font-serif text-[clamp(2.35rem,5.2vw,4rem)] leading-[1.04] tracking-[-0.044em]">
            Find your kind of company.
          </h1>
          <p className="mt-4 max-w-sm leading-relaxed text-[#e2eee7]">
            Book an approved Plus One by the hour for a coffee, an outing, or an event.
          </p>
          <Link href="/discover" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#e1efa9] px-5 py-2.5 font-semibold text-[#153c32] hover:bg-[#edf6c8] focus-visible:outline-[#e1efa9]">
            <PlusOneIcon name="discover" className="size-5" /> Explore team members
          </Link>
        </div>
        <div className="relative aspect-[2/1] bg-[#244b3e] md:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- The responsive WebPs are encoded once from the original. */}
          <img
            src={cafePhotoMedium.src}
            srcSet={cafePhotoSet}
            sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 767px) calc(100vw - 4rem), (max-width: 1151px) max(52vw, 475px), 600px"
            width={cafePhoto.width}
            height={cafePhoto.height}
            alt="Two friends laughing over coffee at an outdoor Mumbai café"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[50%_46%]"
          />
        </div>
      </section>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="mb-3.5 text-2xl font-bold tracking-tight">Your Plus One</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {shortcuts.map(({ title, href, icon, description }) => (
            <li key={href}>
              <Link href={href} className="group flex h-full min-w-0 items-center gap-3.5 rounded-2xl border border-[#dae3d8] bg-white p-4 transition-colors hover:border-accent/50 hover:bg-[#f5faf5] sm:p-5 md:flex-col md:items-start md:gap-3 lg:flex-row lg:items-center">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e6f0e7] text-accent">
                  <PlusOneIcon name={icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 md:grid-cols-[1.12fr_1fr]">
        <section aria-labelledby="dashboard-team-title" className="rounded-2xl border border-[#dae3d8] bg-white p-5 sm:p-6">
          <h2 id="dashboard-team-title" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <PlusOneIcon name="team" className="size-5 shrink-0 text-accent" /> Team membership
          </h2>
          <Suspense fallback={<p role="status" className="mt-2 text-muted">Checking application status…</p>}>
            <TeamMemberPanel />
          </Suspense>
        </section>
        <section aria-labelledby="dashboard-safety-title" className="rounded-2xl border border-[#e3e8d1] bg-[#f0f3e3] p-5 sm:p-6">
          <h2 id="dashboard-safety-title" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <PlusOneIcon name="shield" className="size-5 shrink-0 text-accent" /> First meetup
          </h2>
          <p className="mt-2 leading-relaxed text-muted">Pick a public place and agree on the details in your private booking chat.</p>
          <Link href="/?intro=1" className="mt-1 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">
            How Plus One works
          </Link>
        </section>
      </div>
    </div>
  );
}
