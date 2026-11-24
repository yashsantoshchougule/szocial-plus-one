import Link from "next/link";
import { redirect } from "next/navigation";
import { RouteState } from "@/components/route-state";
import { ApplicationAccess } from "@/features/applications/details";
import { applicationSession, ownApplication } from "@/features/applications/data";
import { readTeamSetup } from "@/features/applications/team-profile-data";
import { TeamCoverForm, TeamProfileForm, TeamPublicationForm } from "@/features/applications/team-profile-form";
import { signCovers } from "@/features/discover/data";
import { activities, hourlyRate } from "@/features/discover/filters";
import { MemberPhoto } from "@/features/discover/member-card";
import { PostForm } from "@/features/discover/post-form";
import { plusOneStorage } from "@/lib/plus-one-project";

export const metadata = { title: "Team profile setup" };

export default async function TeamSetupPage() {
  const session = await applicationSession();
  const heading = <h1 className="mb-6 text-3xl font-bold tracking-tight">Team profile setup</h1>;
  if (session.kind !== "ready") return <>{heading}<ApplicationAccess kind={session.kind} /></>;

  const { data, error } = await ownApplication(session);
  if (error) return <>{heading}<ApplicationAccess kind="unavailable" /></>;
  if (data?.status !== "approved") redirect("/application");
  const { setup, error: setupError } = await readTeamSetup(session);
  if (setupError) return <>{heading}<ApplicationAccess kind="unavailable" /></>;
  if (!setup?.allowed) redirect("/application");

  const profile = setup.profile;
  const accepting = Boolean(profile?.published_at && profile.accepting_bookings);
  const canUpload = Boolean(plusOneStorage());
  const cover = profile?.cover_key ? (await signCovers([profile.cover_key])).get(profile.cover_key) : undefined;
  const applicationActivities = data.activities.toLowerCase();
  const values = {
    displayName: profile?.display_name ?? data.display_name,
    area: profile?.area ?? data.area.slice(0, 100),
    bio: profile?.bio ?? data.introduction,
    languages: profile?.languages.join(", ") ?? data.languages.replaceAll("·", ","),
    activities: profile?.activities ?? activities.filter(({ value, label }) =>
      applicationActivities.includes(value) || applicationActivities.includes(label.toLowerCase())
    ).map(({ value }) => value),
  };
  return (
    <>
      {heading}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="min-w-0 space-y-5">
          <TeamProfileForm values={values} hasProfile={Boolean(profile)} />
          {accepting && (canUpload ? <PostForm /> : <RouteState title="Photo publishing is temporarily unavailable" description="Try again later." />)}
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="space-y-3 rounded-2xl border border-accent/15 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-semibold">Cover photo</h2>
            {cover && <MemberPhoto photoUrl={cover} name={values.displayName} detail />}
            {profile ? <TeamCoverForm hasCover={Boolean(profile.cover_key)} available={canUpload} />
              : <p className="text-sm text-muted">Save your draft to upload a cover photo.</p>}
          </section>
          <section className="space-y-2 rounded-2xl border border-accent/15 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-semibold">Listing status</h2>
            <p className="font-semibold text-accent">{accepting ? "Published" : profile?.published_at ? "Paused" : "Draft"}</p>
            <p className="text-sm text-muted">
              {profile?.hourly_rate_paise
                ? `${hourlyRate.format(profile.hourly_rate_paise / 100)} / hour`
                : "Operations must set your hourly rate before you can publish."}
            </p>
            {profile && <TeamPublicationForm published={Boolean(profile.published_at)} accepting={accepting}
              ready={Boolean(profile.cover_key && profile.hourly_rate_paise)} />}
            {accepting && profile &&
              <Link href={`/members/${profile.id}`} className="inline-flex min-h-11 items-center font-semibold text-accent underline">View your profile</Link>}
          </section>
        </aside>
      </div>
    </>
  );
}
