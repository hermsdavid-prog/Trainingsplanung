"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin/users", label: "Nutzer" },
  { href: "/admin/groups", label: "Gruppen" },
];

export function AdminShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "var(--dc-neutral-200)" }}>
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-8 px-4 py-8 sm:px-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="kicker">Trainingsplanung und Dokumentation</div>
            <div className="mt-1 flex items-center gap-4">
              <span className="text-[17px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                Admin
              </span>
              <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                {fullName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary">
                Abmelden
              </button>
            </form>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="chip"
                style={{
                  background: active ? "var(--dc-accent)" : "transparent",
                  color: active ? "var(--dc-bg)" : "var(--dc-text)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-md)", padding: "34px 40px 44px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
