"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const TABS = [
  { href: "/athlete", label: "Heute", match: (p: string) => p === "/athlete" },
  { href: "/athlete/calendar", label: "Kalender", match: (p: string) => p.startsWith("/athlete/calendar") },
  { href: "/athlete/athletik", label: "Athletik", match: (p: string) => p.startsWith("/athlete/athletik") },
  { href: "/athlete/plans/new", label: "Erstellen", match: (p: string) => p.startsWith("/athlete/plans/new") },
];

export function AthleteShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col" style={{ background: "var(--dc-bg)" }}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--dc-divider)" }}
      >
        <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
          {fullName}
        </span>
        <div className="flex items-center gap-1.5">
          <Link href="/athlete/health" className="btn btn-ghost" aria-label="Gesundheit">
            Gesundheit
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost">
              Abmelden
            </button>
          </form>
        </div>
      </div>

      <main className="flex-1 px-4 pt-3 pb-24 sm:px-6">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[560px]"
        style={{ background: "var(--dc-bg)", borderTop: "1px solid var(--dc-divider)" }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="tabbtn"
              style={{ color: active ? "var(--dc-accent)" : "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
