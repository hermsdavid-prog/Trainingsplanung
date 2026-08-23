"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateShort } from "@/lib/date";

// The compact "N Termine" trigger for a grouped list row (repeated/copied
// trainings) — collapsed by default so the list stays scannable, opens a
// small panel of every occurrence's date on click, each linking straight to
// that specific plan's edit page.
export function PlanOccurrenceDropdown({
  occurrences,
}: {
  occurrences: { id: string; date: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        className="chip"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {occurrences.length} Termine {open ? "▴" : "▾"}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-10 mt-1 flex flex-col gap-0.5 p-1.5"
          style={{
            background: "var(--dc-bg)",
            border: "1px solid var(--dc-divider)",
            boxShadow: "var(--dc-shadow-lg)",
            minWidth: 130,
          }}
        >
          {occurrences.map((o) => (
            <Link
              key={o.id}
              href={`/trainer/plans/${o.id}/edit`}
              className="navbtn"
              onClick={() => setOpen(false)}
            >
              {formatDateShort(o.date)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
