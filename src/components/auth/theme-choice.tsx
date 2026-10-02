"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "system", label: "Automatisch" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
] as const;

// Only known after hydration (next-themes reads localStorage), so the
// server render shows no selection instead of a wrong one.
const subscribe = () => () => {};

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Darstellung">
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className="chip"
            onClick={() => setTheme(o.value)}
            style={{
              background: active ? "var(--dc-accent)" : "transparent",
              color: active ? "var(--dc-on-accent)" : "var(--dc-text)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
