"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusOneIcon } from "./plus-one-icon";

const destinations = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Discover", href: "/discover", icon: "discover" },
  { label: "Bookings", href: "/bookings", icon: "bookings" },
  { label: "Chats", href: "/chats", icon: "chats" },
] as const;

export function CustomerNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Plus One navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-accent/15 bg-canvas px-2 pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:p-0"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 py-2 md:flex md:max-w-none md:gap-2 md:py-0">
        {destinations.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={"flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[0.8125rem] font-semibold md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-sm " +
                  (active ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/5 hover:text-ink")}
              >
                <PlusOneIcon name={icon} className="size-[1.125rem]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
