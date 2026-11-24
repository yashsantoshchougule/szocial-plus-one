"use client";

import { useState } from "react";
import { szocialOrigin } from "@/lib/login-destination";

export function ShareProfile({ origin, memberId, name }: { origin?: string; memberId: string; name: string }) {
  const [status, setStatus] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  async function share() {
    setStatus("");
    setManualUrl("");
    let url: string;
    try {
      url = new URL(`/plus-one/members/${memberId}`, origin ? szocialOrigin(origin) : window.location.origin).href;
    } catch {
      setStatus("Profile link is unavailable.");
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("Profile link copied");
    } catch {
      setManualUrl(url);
      setStatus("Copy the profile link below.");
    }
  }

  return (
    <>
      <button type="button" onClick={share}
        className="min-h-11 rounded-xl border border-accent/25 px-3 font-semibold text-accent hover:bg-accent/5">Share profile</button>
      <p role="status" className={status ? "basis-full text-sm text-muted" : "sr-only"}>{status}</p>
      {manualUrl && <input type="text" readOnly aria-label="Profile link" value={manualUrl}
        className="min-h-11 min-w-0 basis-full rounded-lg border border-accent/25 px-3 text-sm"
        onFocus={(event) => event.currentTarget.select()} />}
    </>
  );
}
