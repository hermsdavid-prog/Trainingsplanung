"use client";

import { useState, useTransition } from "react";
import { dismissBadgeAction } from "@/lib/actions/badges";

export type EarnedBadge = {
  key: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
};

// dismissible is only passed on the athlete's own view (src/app/athlete/page.tsx)
// — the trainer's read-only look at an athlete's achievements
// (src/app/trainer/athletes/page.tsx) leaves it off so a trainer can't hide
// another athlete's history.
export function BadgesList({ badges, dismissible = false }: { badges: EarnedBadge[]; dismissible?: boolean }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visible = badges.filter((b) => !hidden.has(b.key));

  if (visible.length === 0) {
    return <p className="mt-3 text-sm text-muted">Noch keine Erfolge freigeschaltet.</p>;
  }

  function dismiss(key: string) {
    setHidden((prev) => new Set(prev).add(key));
    startTransition(async () => {
      await dismissBadgeAction(key);
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2.5">
      {visible.map((b) => (
        <div
          key={b.key}
          className="relative flex items-start gap-2.5 p-3"
          style={{ background: "var(--dc-surface)", minWidth: 220, maxWidth: 280 }}
        >
          <span className="text-[22px] leading-none">{b.icon}</span>
          <div className="min-w-0">
            <div className="text-[14px] leading-[1.3]">{b.title}</div>
            <p className="mt-0.5 text-xs leading-[1.4] text-muted">{b.description}</p>
            <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}>
              {new Date(b.earnedAt).toLocaleDateString("de-DE")}
            </p>
          </div>
          {dismissible && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => dismiss(b.key)}
              aria-label="Erfolg ausblenden"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center text-xs leading-none"
              style={{ background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
