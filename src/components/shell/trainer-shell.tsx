"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/trainer", label: "Übersicht", match: (p: string) => p === "/trainer" },
  {
    href: "/trainer/plans?type=Athletik",
    label: "Athletik",
    match: (p: string, sp: string) => p.startsWith("/trainer/plans") && sp === "Athletik",
  },
  {
    href: "/trainer/plans?type=Sportartspezifisch",
    label: "Karate",
    // Sportartspezifisch is the default category when the plans page has no
    // ?type= param (see PLAN_TYPES[0] in src/lib/plan-type.ts), so treat a
    // missing param the same as an explicit match here.
    match: (p: string, sp: string) =>
      p.startsWith("/trainer/plans") && sp !== "Athletik",
  },
  { href: "/trainer/calendar", label: "Kalender", match: (p: string) => p.startsWith("/trainer/calendar") },
  { href: "/trainer/groups", label: "Gruppen", match: (p: string) => p.startsWith("/trainer/groups") },
  { href: "/trainer/athletes", label: "Athleten", match: (p: string) => p.startsWith("/trainer/athletes") },
  { href: "/trainer/mesocycles", label: "Mesozyklen", match: (p: string) => p.startsWith("/trainer/mesocycles") },
  { href: "/trainer/report", label: "Wochenbericht", match: (p: string) => p.startsWith("/trainer/report") },
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
            className="navbtn"
            style={{
              background: active ? "var(--dc-accent)" : "transparent",
              color: active ? "var(--dc-bg)" : "var(--dc-text)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function TrainerShell({
  fullName,
  role,
  children,
}: {
  fullName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const typeParam = searchParams.get("type") ?? "";
  const current = NAV.find((n) => n.match(pathname, typeParam))?.label ?? "Übersicht";

  return (
    <div className="min-h-screen" style={{ background: "var(--dc-neutral-200)" }}>
      <div
        className="mx-auto flex w-full max-w-[1320px] min-h-screen lg:min-h-0 lg:my-8 flex-col lg:flex-row lg:shadow-[var(--dc-shadow-md)]"
        style={{ background: "var(--dc-bg)" }}
      >
        {/* Desktop sidebar */}
        <aside
          className="no-print hidden lg:flex lg:w-[222px] flex-none flex-col p-[26px_22px]"
          style={{ background: "var(--dc-surface)" }}
        >
          <div className="font-heading text-[17px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
            Trainingsplanung
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
            {fullName} · Trainer
          </div>
          <div className="mt-7">
            <NavLinks pathname={pathname} typeParam={typeParam} />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-6">
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-block">
                Abmelden
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div
          className="no-print flex lg:hidden items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--dc-divider)" }}
        >
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Menü öffnen"
            className="flex size-11 flex-none items-center justify-center text-[22px]"
            style={{ background: "transparent", border: 0, color: "var(--dc-text)" }}
          >
            ⋮
          </button>
          <span className="text-[17px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
            {current}
          </span>
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="flex w-[258px] flex-none flex-col p-5"
              style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-lg)" }}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[16px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                    Trainingsplanung
                  </div>
                  <div
                    className="mt-0.5 text-[11px]"
                    style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}
                  >
                    {fullName} · Trainer
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Menü schließen"
                  className="-mt-1.5 -mr-1.5 flex size-8 flex-none items-center justify-center text-[16px]"
                  style={{ background: "transparent", border: 0, color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}
                >
                  ✕
                </button>
              </div>
              <div className="mt-5">
                <NavLinks pathname={pathname} typeParam={typeParam} onNavigate={() => setNavOpen(false)} />
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-6">
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
