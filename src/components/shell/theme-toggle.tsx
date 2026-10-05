"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

// Known only after hydration (next-themes reads localStorage / the system
// setting), so the server render shows a neutral placeholder.
const subscribe = () => () => {};

// One tap between light and dark, wherever the app is. Overrides the
// automatic setting; "Automatisch" stays available under Konto.
export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "tab" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Hell" : "Dunkel";
  const aria = isDark ? "Hellen Modus einschalten" : "Dunklen Modus einschalten";
  const Icon = isDark ? Sun : Moon;

  if (variant === "tab") {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={aria}
        title={aria}
        className="btn btn-ghost flex-col gap-0.5 text-[11px] font-medium"
        style={{ padding: "4px 6px", color: "var(--dc-muted)", visibility: mounted ? "visible" : "hidden" }}
      >
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={aria}
      title={aria}
      className="btn btn-icon flex-none"
      style={{ color: "var(--dc-text)", visibility: mounted ? "visible" : "hidden" }}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
