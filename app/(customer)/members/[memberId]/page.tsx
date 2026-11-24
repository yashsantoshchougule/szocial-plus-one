import Link from "next/link";
import { notFound } from "next/navigation";
import { RouteState } from "@/components/route-state";
import { PlusOneIcon } from "@/components/plus-one-icon";
import { sharedSession } from "@/lib/server-session";
import { findMember } from "@/features/discover/data";
import { discoverDemoEnabled, findDemoMember } from "@/features/discover/demo";
import { activityLabel, hourlyRate, isMemberId } from "@/features/discover/filters";
import { BookingState, MemberPhoto } from "@/features/discover/member-card";
import { findProfilePosts } from "@/features/discover/profile-posts-data";
import { postableProfileId } from "@/features/discover/post-publisher";
import { ProfilePostsGallery } from "@/features/discover/profile-posts-gallery";
import { ShareProfile } from "@/features/discover/share-profile";

export const metadata = { title: "Team member" };

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!isMemberId(memberId)) notFound();
  const session = await sharedSession();
  const profile = session.kind === "ready" ? await findMember(session, memberId) : null;
  if (session.kind === "ready" && !profile?.error && !profile?.member) notFound();

  const demoMember = discoverDemoEnabled() ? findDemoMember(memberId) : undefined;
  const member = profile?.member ?? demoMember;
  const [gallery, ownProfile] = session.kind === "ready" && profile?.member
    ? await Promise.all([findProfilePosts(session, profile.member.id), postableProfileId(session.userId)])
    : [null, null];
  const posts = gallery?.posts ?? demoMember?.posts ?? [];
  const showPosts = Boolean(gallery?.error || posts.length);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/discover" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">Back to Discover</Link>
        {member && <ShareProfile origin={process.env.SZOCIAL_PUBLIC_ORIGIN} memberId={member.id} name={member.display_name} />}
        {ownProfile && ownProfile === member?.id && (
          <Link href="/team/setup#create-post" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-3 font-semibold text-white">Create post</Link>
        )}
      </div>
      {member ? (
        <div className={showPosts ? "mx-auto grid min-w-0 max-w-2xl gap-6" : "grid items-start gap-6 lg:grid-cols-2 lg:gap-10"}>
          <MemberPhoto photoUrl={member.photoUrl} name={member.display_name} detail />
          {gallery?.error ? (
            <section aria-label="Posts">
              <h2 className="text-xl font-semibold">Posts</h2>
              <p className="mt-2 text-sm text-muted">Posts are temporarily unavailable.</p>
            </section>
          ) : posts.length > 0 ? <ProfilePostsGallery posts={posts} /> : null}
          <div className="min-w-0 rounded-2xl border border-[#d9e2d7] bg-white p-6 sm:p-8">
            {demoMember && <p className="mb-2 text-sm font-medium text-muted">Demo profile</p>}
            <h1 className="font-serif text-4xl break-words tracking-tight">{member.display_name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted"><PlusOneIcon name="location" className="size-4 shrink-0 text-accent" />{member.area}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BookingState busy={member.busy} />
              <p className="font-semibold text-accent">{hourlyRate.format(member.hourly_rate_paise / 100)} / hour</p>
            </div>
            <h2 className="mt-6 text-lg font-semibold">About</h2>
            <p className="mt-1 leading-relaxed break-words whitespace-pre-line text-muted">{member.bio}</p>
            <dl className="mt-5 space-y-3 border-t border-accent/15 pt-4">
              <div><dt className="font-semibold">Languages</dt><dd className="break-words text-muted">{member.languages.join(" · ")}</dd></div>
              <div><dt className="font-semibold">Activities</dt><dd className="break-words text-muted">{member.activities.map(activityLabel).join(" · ")}</dd></div>
            </dl>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <PlusOneIcon name="chats" className="size-4 shrink-0 text-accent" /> Private chat opens after a paid booking.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mb-5 text-3xl font-bold">Team member</h1>
          <RouteState title={session.kind === "signed-out" ? "Sign in through Szocial" : "Profile unavailable"}
            description="Open Discover to view team members available to your account." />
        </>
      )}
    </>
  );
}
