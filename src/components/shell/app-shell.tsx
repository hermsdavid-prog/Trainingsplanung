import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

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
  ],
  athlete: [
    { href: "/athlete", label: "Heute" },
    { href: "/athlete/calendar", label: "Kalender" },
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
          <nav className="flex items-center gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
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
