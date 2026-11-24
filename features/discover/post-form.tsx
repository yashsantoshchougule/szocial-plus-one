"use client";

import { useActionState, useState } from "react";
import { publishPost } from "./publish-post";

const field = "block w-full min-w-0 rounded-lg border border-accent/25 bg-white px-3 py-2 text-sm";

export function PostForm() {
  const [count, setCount] = useState(1);
  const [{ message }, submit, pending] = useActionState(publishPost, { message: "" });

  return (
    <section id="create-post" aria-labelledby="create-post-heading" className="rounded-2xl border border-accent/15 bg-white p-4 sm:p-6">
      <h2 id="create-post-heading" className="text-xl font-semibold">Create post</h2>
      <p className="mt-2 text-sm text-muted">Choose up to six JPEG, PNG, or WebP photos in slide order. The first is the cover for this post. Maximum total size: 3.5 MB.</p>
      <form action={submit} className="mt-5">
        <fieldset disabled={pending} className="min-w-0 space-y-4">
          {Array.from({ length: count }, (_, index) => (
            <fieldset key={index} className="min-w-0 space-y-2 rounded-xl border border-accent/15 px-3 pb-3">
              <legend className="px-1 text-sm font-semibold">Photo {index + 1}</legend>
              <input className={field} type="file" name="photo" accept="image/jpeg,image/png,image/webp"
                aria-label={`Choose photo ${index + 1}`} required />
              <label className="block text-sm">
                Photo {index + 1} description
                <input className={`${field} mt-1`} name="description" maxLength={250} required />
              </label>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {count < 6 && <button type="button" className="min-h-11 rounded-lg px-3 font-semibold text-accent underline"
              onClick={() => setCount(count + 1)}>Add another photo</button>}
            {count > 1 && <button type="button" className="min-h-11 rounded-lg px-3 text-sm text-accent underline"
              onClick={() => setCount(count - 1)}>Remove last photo</button>}
            <button className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-60" type="submit">
              {pending ? "Publishing…" : "Publish post"}
            </button>
          </div>
        </fieldset>
        {message && <p role="alert" className="mt-3 text-sm text-ink">{message}</p>}
      </form>
    </section>
  );
}
