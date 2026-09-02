"use client";

import { useEffect, useRef, useState } from "react";

export type TypeaheadItem = { id: string; label: string };

// Generic search-as-you-type picker: an input filtering a dropdown list,
// click to select, click-outside to close. Used wherever a plain <select>
// would get unwieldy with many options (exercises, groups, athletes …).
// With allowClear, a "clearLabel" row always sits at the top of the open
// list (regardless of the current query) so the filter can be reset back
// to "no selection" without a separate clear button.
export function Typeahead({
  id,
  label,
  items,
  selectedId,
  onSelect,
  placeholder = "Buchstaben tippen …",
  emptyMessage = "Keine Treffer.",
  allowClear = false,
  clearLabel = "Alle",
}: {
  id: string;
  label: string;
  items: TypeaheadItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const selected = items.find((i) => i.id === selectedId);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, selected?.label]);

  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;

  function pick(item: TypeaheadItem | null) {
    setQuery(item?.label ?? "");
    setOpen(false);
    onSelect(item?.id ?? "");
  }

  return (
    <div ref={containerRef} className="field w-auto relative">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (matches.length > 0 || allowClear) && (
        <div
          className="absolute left-0 top-full z-10 mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5"
          style={{
            background: "var(--dc-bg)",
            border: "1px solid var(--dc-divider)",
            boxShadow: "var(--dc-shadow-lg)",
            minWidth: 220,
          }}
        >
          {allowClear && (
            <button
              type="button"
              className="navbtn"
              onClick={() => pick(null)}
              style={!selectedId ? { background: "var(--dc-accent-100)", color: "var(--dc-accent-800)" } : undefined}
            >
              {clearLabel}
            </button>
          )}
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              className="navbtn"
              onClick={() => pick(item)}
              style={item.id === selectedId ? { background: "var(--dc-accent-100)", color: "var(--dc-accent-800)" } : undefined}
            >
              {item.label}
            </button>
          ))}
          {q && matches.length === 0 && (
            <p className="p-2 text-sm text-muted">{emptyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
