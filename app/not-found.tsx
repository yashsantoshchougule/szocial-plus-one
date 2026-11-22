import Link from "next/link";
import { RouteState } from "@/components/route-state";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-18">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Page not found</h1>
      <RouteState
        title="This link may be out of date"
        description="Start again from the Plus One directory."
      >
        <Link
          href="/discover"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          Go to Discover
        </Link>
      </RouteState>
    </main>
  );
}
