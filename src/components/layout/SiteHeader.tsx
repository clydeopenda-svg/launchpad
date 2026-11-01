"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const navLinks = [
  { href: "/usher", label: "Check-in" },
  { href: "/attendee", label: "Vote" },
  { href: "/organizer", label: "Organizer" },
  { href: "/assistant", label: "Assistant" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LaunchPad
        </Link>
        <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-card px-3 py-2 text-sm font-medium transition",
                  active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-primary-soft hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
