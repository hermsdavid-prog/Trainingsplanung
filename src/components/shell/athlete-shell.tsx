"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { House, CalendarDays, Dumbbell, Layers, CirclePlus, HeartPulse, UserRound } from "lucide-react";

const TABS = [
  { href: "/athlete", label: "Heute", Icon: House, match: (p: string) => p === "/athlete" || p.startsWith("/athlete/plans/") && !p.startsWith("/athlete/plans/new") },
  { href: "/athlete/calendar", label: "Kalender", Icon: CalendarDays, match: (p: string) => p.startsWith("/athlete/calendar") },
  { href: "/athlete/athletik", label: "Athletik", Icon: Dumbbell, match: (p: string) => p.startsWith("/athlete/athletik") },
  { href: "/athlete/mesocycles", label: "Mesozyklen", Icon: Layers, match: (p: string) => p.startsWith("/athlete/mesocycles") },
  { href: "/athlete/plans/new", label: "Erstellen", Icon: CirclePlus, match: (p: string) => p.startsWith("/athlete/plans/new") },
];

// Mobile-first shell for athletes: a sticky top bar (name + Gesundheit /
// Konto) and an icon tab bar at the thumb. "Abmelden" lives on the Konto
// page — it's rarely needed and sat right next to everyday links before,
// one mis-tap away.
export function AthleteShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const topLinks = [
    { href: "/athlete/health", label: "Gesundheit", Icon: HeartPulse },
    { href: "/athlete/settings", label: "Konto", Icon: UserRound },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col" style={{ background: "var(--dc-bg)" }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-1.5"
        style={{ background: "var(--dc-surface)", borderBottom: "1px solid var(--dc-divider)" }}
      >
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight" style={{ fontFamily: "var(--dc-font-heading)" }}>
            Trainingsplanung
          </div>
          <div className="truncate text-[12px]" style={{ color: "var(--dc-muted)" }}>
            {fullName}
          </div>
        </div>
        <nav className="flex items-center gap-0.5" aria-label="Konto und Gesundheit">
          {topLinks.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="btn btn-ghost flex-col gap-0.5 text-[11px] font-medium"
                style={{
                  padding: "4px 10px",
                  color: active ? "var(--dc-accent-700)" : "var(--dc-muted)",
                }}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            );
          })}
          <ThemeToggle variant="tab" />
        </nav>
      </header>

      <main
        className="flex-1 px-4 pt-4 pb-28 sm:px-6"
        // Sticky bottom bars inside pages sit above the fixed tab bar.
        style={{ ["--sticky-bottom-offset" as string]: "calc(50px + max(env(safe-area-inset-bottom), 10px))" }}
      >
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[560px]"
        style={{
          background: "var(--dc-surface)",
          borderTop: "1px solid var(--dc-divider)",
          boxShadow: "0 -2px 12px color-mix(in srgb, #2d2b2b 8%, transparent)",
        }}
        aria-label="Hauptnavigation"
      >
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="tabbtn flex flex-col items-center gap-1"
              aria-current={active ? "page" : undefined}
              style={{
                color: active ? "var(--dc-accent-700)" : "var(--dc-muted)",
                fontWeight: active ? 600 : 400,
                boxShadow: active ? "inset 0 2px 0 var(--dc-accent)" : undefined,
              }}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
