import Link from "next/link";
import type { ReactNode } from "react";
import { CustomerNavigation } from "@/components/customer-navigation";

export default function WebsiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-40 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <header className="border-b border-accent/15 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/dashboard"
            aria-label="Szocial Plus One home"
            className="flex items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight text-ink"
          >
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-accent text-sm text-white">+1</span>
            <span>Szocial <span className="text-accent">Plus One</span></span>
          </Link>
          <CustomerNavigation />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-18"
      >
        {children}
      </main>
    </div>
  );
}
