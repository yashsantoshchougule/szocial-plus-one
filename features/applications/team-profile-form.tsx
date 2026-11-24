"use client";

import { startTransition, useActionState } from "react";
import { activities } from "@/features/discover/filters";
import { changeTeamPublication, saveTeamProfile, uploadTeamCover } from "./team-profile-actions";

type Details = { displayName: string; area: string; bio: string; languages: string; activities: string[] };
const field = "mt-1 block w-full min-w-0 rounded-lg border border-accent/25 bg-white px-3 py-2 text-ink";
const primary = "min-h-11 rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-60";
const panel = "min-w-0 rounded-2xl border border-accent/15 bg-white p-4 sm:p-6";

function Feedback({ state }: { state: { message: string; saved?: boolean } }) {
  if (!state.message) return null;
  return <p role={state.saved ? "status" : "alert"} className={state.saved ? "text-sm text-accent" : "text-sm text-red-800"}>{state.message}</p>;
}

export function TeamProfileForm({ values, hasProfile }: { values: Details; hasProfile: boolean }) {
  const [state, action, pending] = useActionState(saveTeamProfile, { message: "" });
  return (
    <section className={panel} aria-labelledby="team-details">
      <h2 id="team-details" className="text-xl font-semibold">Profile details</h2>
      <p className="mt-2 text-sm text-muted">These details will appear in Discover once you publish.</p>
      <form action={action} className="mt-4 space-y-4" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}>
        <label className="block font-semibold">Display name<input className={field} name="displayName" defaultValue={values.displayName} required maxLength={100} /></label>
        <label className="block font-semibold">General area<input className={field} name="area" defaultValue={values.area} required maxLength={100} /></label>
        <label className="block font-semibold">Bio<textarea className={field} name="bio" defaultValue={values.bio} required maxLength={1500} rows={4} /></label>
        <label className="block font-semibold">Languages (separated by commas)<input className={field} name="languages" defaultValue={values.languages} required maxLength={334} /></label>
        <fieldset className="min-w-0">
          <legend className="mb-2 font-semibold">Activities</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {activities.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="activities" value={value} defaultChecked={values.activities.includes(value)} className="size-4 accent-accent" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={pending} className={primary}>{pending ? "Saving…" : hasProfile ? "Save details" : "Save draft"}</button>
        <Feedback state={state} />
      </form>
    </section>
  );
}

export function TeamCoverForm({ hasCover, available }: { hasCover: boolean; available: boolean }) {
  const [state, action, pending] = useActionState(uploadTeamCover, { message: "" });
  return (
    <form action={action} className="space-y-3">
      <label className="block font-semibold">Choose cover photo
        <input className={field} type="file" name="cover" accept="image/jpeg,image/png,image/webp" required disabled={!available || pending} />
      </label>
      {available ? <p className="text-sm text-muted">JPEG, PNG, or WebP up to 3.5 MB.</p> : <p className="text-sm text-muted">Cover uploads are temporarily unavailable.</p>}
      <button type="submit" disabled={!available || pending} className={primary}>{pending ? "Uploading…" : hasCover ? "Replace cover" : "Upload cover"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function TeamPublicationForm({ published, accepting, ready }: { published: boolean; accepting: boolean; ready: boolean }) {
  const [state, action, pending] = useActionState(changeTeamPublication, { message: "" });
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="publication" value={accepting ? "pause" : "publish"} />
      <button type="submit" disabled={pending || (!accepting && !ready)} className={primary}>
        {pending ? "Updating…" : accepting ? "Pause bookings" : published ? "Resume bookings" : "Publish listing"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
