"use client";

import { useRef } from "react";

// Horizontally-scrollable row of cards with click-to-scroll arrows, so a
// group (or athlete) with many Mesozyklen doesn't force an ever-growing
// vertical list — native trackpad/touch scroll still works too, the
// buttons are just a discoverable alternative for a mouse.
export function MesocycleCarousel({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x proximity" }}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Nach links scrollen"
        onClick={() => scrollBy(-300)}
        className="absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full sm:flex"
        style={{ left: -14, background: "var(--dc-bg)", border: "1px solid var(--dc-divider)", boxShadow: "var(--dc-shadow-md)" }}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Nach rechts scrollen"
        onClick={() => scrollBy(300)}
        className="absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full sm:flex"
        style={{ right: -14, background: "var(--dc-bg)", border: "1px solid var(--dc-divider)", boxShadow: "var(--dc-shadow-md)" }}
      >
        ›
      </button>
    </div>
  );
}
