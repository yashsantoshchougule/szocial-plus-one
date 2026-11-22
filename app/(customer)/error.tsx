"use client";

import Link from "next/link";
import { RouteState } from "@/components/route-state";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Page unavailable</h1>
      <RouteState title="This page couldn’t load" description="Try again or continue to Discover.">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={retry}
            className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold text-white hover:bg-ink"
          >
            Try again
          </button>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            Go to Discover
          </Link>
        </div>
      </RouteState>
    </>
  );
}
