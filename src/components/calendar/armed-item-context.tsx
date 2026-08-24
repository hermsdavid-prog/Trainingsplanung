"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ArmedItem = { id: string; kind: "plan" | "event"; title: string } | null;

type ArmedItemCtx = {
  armedItem: ArmedItem;
  arm: (item: NonNullable<ArmedItem>) => void;
  clear: () => void;
};

const ArmedItemContext = createContext<ArmedItemCtx | null>(null);

// Wraps WeekBoard and CalendarGrid together so a plan/event "armed" for
// copying in one widget (e.g. the week board) can be dropped onto a day in
// the other (e.g. the month grid) — without this, each widget's own
// useState kept the selection siloed and a term picked in the week view
// could only ever be copied to another day within that same week.
export function CalendarArmedProvider({ children }: { children: ReactNode }) {
  const [armedItem, setArmedItem] = useState<ArmedItem>(null);
  return (
    <ArmedItemContext.Provider
      value={{ armedItem, arm: setArmedItem, clear: () => setArmedItem(null) }}
    >
      {children}
    </ArmedItemContext.Provider>
  );
}

// Falls back to local state when used outside a provider (e.g. the athlete
// calendar page renders CalendarGrid alone, with copying disabled anyway).
export function useArmedItem(): ArmedItemCtx {
  const ctx = useContext(ArmedItemContext);
  const [localArmed, setLocalArmed] = useState<ArmedItem>(null);
  if (ctx) return ctx;
  return { armedItem: localArmed, arm: setLocalArmed, clear: () => setLocalArmed(null) };
}
