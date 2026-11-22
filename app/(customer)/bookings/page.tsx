import Link from "next/link";
import { RouteState } from "@/components/route-state";

export const metadata = { title: "Bookings" };

export default function BookingsPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Bookings</h1>
      <RouteState
        title="No bookings yet"
        description="Your upcoming and past Plus One bookings will appear here."
      >
        <Link
          href="/discover"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          Explore Plus One
        </Link>
      </RouteState>
    </>
  );
}
