import Link from "next/link";
import { RouteState } from "@/components/route-state";

export const metadata = { title: "Chats" };

export default function ChatsPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Chats</h1>
      <RouteState
        title="No chats yet"
        description="A private conversation appears here once your booking is paid."
      >
        <Link
          href="/bookings"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          View bookings
        </Link>
      </RouteState>
    </>
  );
}
