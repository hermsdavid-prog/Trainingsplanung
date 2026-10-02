"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dumbbell,
  Swords,
  CalendarDays,
  Users,
  UserRound,
  Layers,
  FileText,
  Download,
  Activity,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/trainer", label: "Übersicht", Icon: LayoutDashboard, match: (p: string) => p === "/trainer" },
  {
    href: "/trainer/plans?type=Athletik",
    label: "Athletik",
    Icon: Dumbbell,
    match: (p: string, sp: string) => (p === "/trainer/plans" || p === "/trainer/plans/new") && sp === "Athletik",
  },
  {
    href: "/trainer/plans?type=Sportartspezifisch",
    label: "Karate",
    Icon: Swords,
    // Sportartspezifisch is the default category when the plans page has no
    // ?type= param (see PLAN_TYPES[0] in src/lib/plan-type.ts), so treat a
    // missing param the same as an explicit match here. Only the list and
    // "new" pages carry ?type= — a single plan's edit/workout page doesn't,
    // so matching those here would wrongly light up Karate for an Athletik
    // plan.
    match: (p: string, sp: string) => (p === "/trainer/plans" || p === "/trainer/plans/new") && sp !== "Athletik",
  },
  { href: "/trainer/calendar", label: "Kalender", Icon: CalendarDays, match: (p: string) => p.startsWith("/trainer/calendar") },
  { href: "/trainer/groups", label: "Gruppen", Icon: Users, match: (p: string) => p.startsWith("/trainer/groups") },
  { href: "/trainer/athletes", label: "Athleten", Icon: UserRound, match: (p: string) => p.startsWith("/trainer/athletes") },
  { href: "/trainer/mesocycles", label: "Mesozyklen", Icon: Layers, match: (p: string) => p.startsWith("/trainer/mesocycles") },
  { href: "/trainer/training", label: "Mein Training", Icon: Activity, match: (p: string) => p.startsWith("/trainer/training") || /^\/trainer\/plans\/[^/]+\/session$/.test(p) },
  { href: "/trainer/report", label: "Wochenbericht", Icon: FileText, match: (p: string) => p.startsWith("/trainer/report") },
  { href: "/trainer/export", label: "Export", Icon: Download, match: (p: string) => p.startsWith("/trainer/export") },
];

function NavLinks({
  pathname,
  typeParam,
  onNavigate,
}: {
  pathname: string;
  typeParam: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.match(pathname, typeParam);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="navbtn flex items-center gap-2.5"
            aria-current={active ? "page" : undefined}
            style={{
              background: active ? "var(--dc-accent)" : undefined,
              color: active ? "var(--dc-on-accent)" : "var(--dc-text)",
              fontWeight: active ? 600 : 400,
            }}
          >
            <item.Icon className="size-[17px] flex-none" strokeWidth={active ? 2 : 1.6} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function TrainerShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const typeParam = searchParams.get("type") ?? "";
  const current =
    NAV.find((n) => n.match(pathname, typeParam))?.label ??
    (pathname.startsWith("/trainer/plans") ? "Training" : pathname.startsWith("/trainer/settings") ? "Konto" : "Übersicht");

  return (
    <div className="min-h-screen" style={{ background: "var(--dc-neutral-200)" }}>
      <div
        className="mx-auto flex w-full max-w-[1320px] min-h-screen lg:min-h-0 lg:my-8 flex-col lg:flex-row lg:shadow-[var(--dc-shadow-md)]"
        style={{ background: "var(--dc-bg)" }}
      >
        {/* Desktop sidebar */}
        <aside
          className="no-print hidden lg:block lg:w-[222px] flex-none"
          style={{ background: "var(--dc-surface)" }}
        >
          {/* Sticky inner column so the navigation stays reachable while a
              long page (calendar, plan editor) scrolls underneath. */}
          <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto p-[26px_22px]" style={{ minHeight: "min(100vh, 100%)" }}>
            <div className="font-heading text-[17px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
              Trainingsplanung
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: "var(--dc-muted)" }}>
              {fullName} · Trainer
            </div>
            <div className="mt-7">
              <NavLinks pathname={pathname} typeParam={typeParam} />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/trainer/settings" className="btn btn-ghost btn-block">
                Passwort ändern
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-secondary btn-block">
                  Abmelden
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div
          className="no-print sticky top-0 z-30 flex lg:hidden items-center gap-2 px-2 py-1"
          style={{ borderBottom: "1px solid var(--dc-divider)", background: "var(--dc-surface)" }}
        >
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Menü öffnen"
            className="btn btn-icon flex-none"
            style={{ color: "var(--dc-text)" }}
          >
            <Menu className="size-[22px]" strokeWidth={1.75} aria-hidden />
          </button>
          <span className="text-[17px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
            {current}
          </span>
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="flex w-[272px] flex-none flex-col overflow-y-auto p-5"
              style={{ background: "var(--dc-surface)", boxShadow: "var(--dc-shadow-lg)" }}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[16px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                    Trainingsplanung
                  </div>
                  <div
                    className="mt-0.5 text-[11px]"
                    style={{ color: "var(--dc-muted)" }}
                  >
                    {fullName} · Trainer
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Menü schließen"
                  className="btn btn-icon -mt-2 -mr-2 flex-none"
                  style={{ color: "var(--dc-muted)" }}
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="mt-5">
                <NavLinks pathname={pathname} typeParam={typeParam} onNavigate={() => setNavOpen(false)} />
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Link href="/trainer/settings" className="btn btn-ghost btn-block" onClick={() => setNavOpen(false)}>
                  Passwort ändern
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-secondary btn-block">
                    Abmelden
                  </button>
                </form>
              </div>
            </div>
            <button
              type="button"
              aria-label="Menü schließen"
              onClick={() => setNavOpen(false)}
              className="flex-1 cursor-default border-0"
              style={{ background: "color-mix(in srgb, var(--dc-neutral-900) 45%, transparent)" }}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <main className={cn("p-4 lg:p-[34px_40px_44px]")}>{children}</main>
        </div>
      </div>
    </div>
  );
}
