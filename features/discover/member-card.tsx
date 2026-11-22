import Link from "next/link";
import Image from "next/image";
import { PlusOneIcon } from "@/components/plus-one-icon";
import type { DirectoryCard } from "./data";
import { activityLabel, hourlyRate } from "./filters";

export function MemberPhoto({ photoUrl, name, detail = false }: {
  photoUrl?: string;
  name: string;
  detail?: boolean;
}) {
  return (
    <div className={`relative grid place-items-center overflow-hidden bg-[#e6eee3] text-accent/70 ${detail ? "aspect-[4/3] rounded-2xl" : "aspect-[16/10]"}`}>
      <PlusOneIcon name="team" className="size-14" />
      {photoUrl && <Image
        src={photoUrl}
        alt={detail ? name + "’s profile photo" : ""}
        fill
        unoptimized
        referrerPolicy="no-referrer"
        className="object-cover"
      />}
    </div>
  );
}

export function BookingState({ busy }: { busy: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${busy ? "bg-[#fbefda] text-[#724717]" : "bg-[#e6f0e6] text-[#205b43]"}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {busy ? "Currently busy" : "Accepting bookings"}
    </span>
  );
}

export function MemberCard({ member }: { member: DirectoryCard }) {
  return (
    <Link href={"/members/" + member.id} prefetch={false}
      className="group block h-full overflow-hidden rounded-2xl border border-[#d9e2d7] bg-white transition-colors hover:border-accent/55">
      <MemberPhoto photoUrl={member.photoUrl} name={member.display_name} />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold break-words text-ink group-hover:underline group-hover:underline-offset-4">{member.display_name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <PlusOneIcon name="location" className="size-4 shrink-0 text-accent" /> <span className="break-words">{member.area}</span>
            </p>
          </div>
          <p className="mt-0.5 whitespace-nowrap font-semibold text-accent">
            {hourlyRate.format(member.hourly_rate_paise / 100)} <span className="text-sm font-normal text-muted">/ hr</span>
          </p>
        </div>
        <p className="text-sm leading-relaxed break-words text-muted">{member.activities.slice(0, 3).map(activityLabel).join(" · ")}</p>
        <BookingState busy={member.busy} />
      </div>
    </Link>
  );
}
