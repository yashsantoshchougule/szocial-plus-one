"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PlusOneIcon } from "@/components/plus-one-icon";
import type { ProfilePost, ProfilePostPhoto } from "./profile-posts";

function PostPhoto({ photo, thumbnail = false, eager = false }: {
  photo: ProfilePostPhoto;
  thumbnail?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="grid size-full place-items-center p-2 text-center text-sm">Photo unavailable</span>;
  /* The browser must send its session cookie to the protected media route. */
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={photo.src} alt={thumbnail ? "" : photo.alt} loading={eager ? "eager" : "lazy"}
    draggable={false} onError={() => setFailed(true)}
    className={`block size-full ${thumbnail ? "object-cover" : "object-contain"}`} />;
}

function PostViewer({ post, title, onClose }: { post: ProfilePost; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const position = useRef(0);
  const total = post.photos.length;

  useEffect(() => {
    const element = dialog.current!;
    const scroller = track.current!;
    element.showModal();
    close.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const resize = new ResizeObserver(() => {
      scroller.scrollTo({ left: position.current * scroller.clientWidth, behavior: "instant" });
    });
    resize.observe(scroller);
    return () => {
      resize.disconnect();
      document.body.style.overflow = overflow;
    };
  }, []);

  function select(next: number, currentButton?: HTMLButtonElement) {
    if (next < 0 || next >= total || !track.current) return;
    if ((next === 0 || next === total - 1) && document.activeElement === currentButton) close.current?.focus();
    track.current.scrollTo({ left: next * track.current.clientWidth, behavior: "instant" });
  }

  function arrows(event: KeyboardEvent<HTMLDialogElement>) {
    if (total === 1 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    select(index + (event.key === "ArrowLeft" ? -1 : 1),
      event.target instanceof HTMLButtonElement ? event.target : undefined);
  }

  return (
    <dialog ref={dialog} aria-label={title} onClose={onClose} onKeyDown={arrows}
      className="group fixed m-auto w-[min(92vw,48rem)] max-w-none overflow-hidden rounded-2xl bg-ink text-white shadow-xl backdrop:bg-black/65">
      <button ref={close} type="button" aria-label="Close" onClick={() => dialog.current?.close()}
        className="absolute top-2 right-2 z-10 grid size-11 place-items-center rounded-full bg-black/70 text-2xl text-white">
        <span aria-hidden="true">×</span>
      </button>
      <div ref={track} className="flex h-[min(62dvh,36rem)] snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-ink text-white [scrollbar-width:none]"
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget;
          if (!clientWidth) return;
          const next = Math.max(0, Math.min(total - 1, Math.round(scrollLeft / clientWidth)));
          position.current = next;
          setIndex(next);
        }}>
        {post.photos.map((photo, slide) => (
          <div key={photo.src} aria-hidden={index !== slide}
            className="h-full w-full shrink-0 snap-start snap-always">
            <PostPhoto photo={photo} eager={slide === 0} />
          </div>
        ))}
      </div>
      {total > 1 && (
        <>
          <button type="button" aria-label="Previous photo" disabled={index === 0}
            onClick={(event) => select(index - 1, event.currentTarget)}
            className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-xl text-white opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:enabled:opacity-100">←</button>
          <p aria-live="polite" className="sr-only">{index + 1} of {total}</p>
          <button type="button" aria-label="Next photo" disabled={index === total - 1}
            onClick={(event) => select(index + 1, event.currentTarget)}
            className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-xl text-white opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:enabled:opacity-100">→</button>
        </>
      )}
    </dialog>
  );
}

function photoCount(post: ProfilePost) {
  return `${post.photos.length} photo${post.photos.length === 1 ? "" : "s"}`;
}

export function ProfilePostsGallery({ posts }: { posts: ProfilePost[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const openPost = openIndex === null ? undefined : posts[openIndex];

  return (
    <section id="posts" className="scroll-mt-20" aria-labelledby={headingId}>
      <div className="mb-1 flex border-b border-accent/15">
        <h2 id={headingId} className="-mb-px flex items-center gap-2 border-b-2 border-accent px-3 py-3 text-sm font-semibold text-accent">
          <PlusOneIcon name="grid" className="size-4" /> Posts
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {posts.map((post, index) => (
          <button key={post.id} type="button" aria-haspopup="dialog" aria-label={`Open post ${index + 1}, ${photoCount(post)}`}
            className="relative aspect-[4/5] min-w-0 overflow-hidden rounded bg-[#e6eee3] text-accent"
            onClick={(event) => {
              opener.current = event.currentTarget;
              setOpenIndex(index);
            }}>
            <PostPhoto photo={post.photos[0]} thumbnail />
            {post.photos.length > 1 && <span aria-hidden className="absolute top-1.5 right-1.5 rounded bg-ink/90 px-1.5 py-0.5 text-xs font-semibold text-white">{post.photos.length}</span>}
          </button>
        ))}
      </div>
      {openPost && openIndex !== null && (
        <PostViewer post={openPost} title={`Post ${openIndex + 1}`} onClose={() => {
          setOpenIndex(null);
          opener.current?.focus({ preventScroll: true });
        }} />
      )}
    </section>
  );
}
