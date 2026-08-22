"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Hit = {
  key: string;
  label: string;
  meta: string;
  paramKey: "group" | "athlete" | "type";
  paramValue: string;
};

export function CalendarFilters({
  groups,
  athletes,
  eventTypes,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  eventTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allEntries: Hit[] = useMemo(() => {
    const entries: Hit[] = [
      { key: "type:training", label: "Training", meta: "Trainingspläne", paramKey: "type", paramValue: "training" },
    ];
    for (const g of groups) {
      entries.push({ key: `group:${g.id}`, label: g.name, meta: "Gruppe", paramKey: "group", paramValue: g.id });
    }
    for (const a of athletes) {
      entries.push({
        key: `athlete:${a.id}`,
        label: a.full_name,
        meta: "Athlet",
        paramKey: "athlete",
        paramValue: a.id,
      });
    }
    for (const t of eventTypes) {
      entries.push({ key: `type:${t}`, label: t, meta: "Terminart", paramKey: "type", paramValue: t });
    }
    return entries;
  }, [groups, athletes, eventTypes]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allEntries.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, query]);

  const activeLabel = useMemo(() => {
    const groupId = searchParams.get("group");
    const athleteId = searchParams.get("athlete");
    const type = searchParams.get("type");
    if (groupId) return groups.find((g) => g.id === groupId)?.name ?? "Gruppe";
    if (athleteId) return athletes.find((a) => a.id === athleteId)?.full_name ?? "Athlet";
    if (type === "training") return "Training";
    if (type) return type;
    return "keine";
  }, [searchParams, groups, athletes]);

  function pick(hit: Hit) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("group");
    params.delete("athlete");
    params.delete("type");
    params.delete("date");
    params.set(hit.paramKey, hit.paramValue);
    router.push(`${pathname}?${params.toString()}`);
    setQuery(hit.label);
    setOpen(false);
    inputRef.current?.blur();
  }

  function reset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("group");
    params.delete("athlete");
    params.delete("type");
    params.delete("date");
    router.push(`${pathname}?${params.toString()}`);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="field">
        <label htmlFor="calQuery">Filter · aktiv: {activeLabel}</label>
        <input
          id="calQuery"
          ref={inputRef}
          className="input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Buchstaben tippen, z. B. u18"
          autoComplete="off"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full" style={{ background: "var(--dc-surface)" }}>
          {hits.map((h) => (
            <button
              key={h.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h)}
              className="block w-full text-left"
              style={{ padding: "8px 10px", fontFamily: "var(--dc-font-body)", fontSize: "13px", lineHeight: 1.3, background: "transparent", border: 0, cursor: "pointer", color: "var(--dc-text)" }}
            >
              {h.label}
              <span className="block text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                {h.meta}
              </span>
            </button>
          ))}
          {hits.length === 0 && (
            <div className="text-xs" style={{ padding: "8px 10px", color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
              Nichts gefunden.
            </div>
          )}
        </div>
      )}
      <button type="button" className="btn btn-ghost mt-1.5" onClick={reset}>
        Filter zurücksetzen
      </button>
    </div>
  );
}
