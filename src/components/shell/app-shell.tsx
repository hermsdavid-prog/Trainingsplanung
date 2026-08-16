"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  trainer: "Trainer",
  athlete: "Athlet",
};

const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin/users", label: "Nutzer" },
    { href: "/admin/groups", label: "Gruppen" },
  ],
  trainer: [
    { href: "/trainer", label: "Übersicht" },
    { href: "/trainer/plans", label: "Pläne" },
    { href: "/trainer/calendar", label: "Kalender" },
    { href: "/trainer/groups", label: "Gruppen" },
    { href: "/trainer/health", label: "Gesundheit" },
    { href: "/trainer/athletik", label: "Athletik" },
  ],
  athlete: [
    { href: "/athlete", label: "Heute" },
    { href: "/athlete/calendar", label: "Kalender" },
    { href: "/athlete/athletik", label: "Athletik" },
  ],
};

export function AppShell({
  role,
  fullName,
  children,
}: {
  role: string;
  fullName: string;
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[role] ?? [];
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
                TP
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-brand">Trainingsplanung</span>
                <span className="text-xs text-muted-foreground">
                  {fullName} · {ROLE_LABELS[role] ?? role}
                </span>
              </div>
            </div>
            <form action={logoutAction} className="sm:hidden">
              <Button type="submit" variant="outline" size="sm">
                Abmelden
              </Button>
            </form>
          </div>
          <nav className="flex items-center gap-1">
            {nav.map((item) => {
              const isActive =
                item.href === pathname ||
                (item.href !== "/trainer" &&
                  item.href !== "/athlete" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action={logoutAction} className="hidden sm:block">
            <Button type="submit" variant="outline" size="sm">
              Abmelden
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
