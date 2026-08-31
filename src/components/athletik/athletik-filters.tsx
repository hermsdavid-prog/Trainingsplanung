"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function AthletikFilters({
  groups,
  athletes,
  exercises,
}: {
  groups?: { id: string; name: string; athleteCount: number }[];
  athletes?: { id: string; full_name: string }[];
  exercises: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedExerciseId = searchParams.get("exercise") ?? exercises[0]?.id;

  return (
    <div className="flex flex-wrap gap-3">
      {groups && (
        <div className="field w-auto">
          <label>Gruppe</label>
          <select
            className="input"
            defaultValue={searchParams.get("group") ?? groups[0]?.id}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("group", e.target.value);
              params.delete("athlete");
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.athleteCount} Athleten
              </option>
            ))}
          </select>
        </div>
      )}
      {athletes && (
        <div className="field w-auto">
          <label>Athlet</label>
          <select
            className="input"
            defaultValue={searchParams.get("athlete") ?? athletes[0]?.id}
            onChange={(e) => setParam("athlete", e.target.value)}
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ExerciseTypeahead
        key={selectedExerciseId}
        exercises={exercises}
        selectedId={selectedExerciseId}
        onSelect={(id) => setParam("exercise", id)}
      />
    </div>
  );
}

// Buchstaben-Eingabe statt Dropdown — die Übungsliste wird pro Athlet
// schnell lang, ein Dropdown zum Durchscrollen skaliert dabei schlecht.
export function ExerciseTypeahead({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: { id: string; name: string }[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const selected = exercises.find((e) => e.id === selectedId);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, selected?.name]);

  const q = query.trim().toLowerCase();
  const matches = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;

  function pick(exercise: { id: string; name: string }) {
    setQuery(exercise.name);
    setOpen(false);
    onSelect(exercise.id);
  }

  return (
    <div ref={containerRef} className="field w-auto relative">
      <label htmlFor="exercise-typeahead">Übung</label>
      <input
        id="exercise-typeahead"
        className="input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buchstaben tippen …"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div
          className="absolute left-0 top-full z-10 mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5"
          style={{
            background: "var(--dc-bg)",
            border: "1px solid var(--dc-divider)",
            boxShadow: "var(--dc-shadow-lg)",
            minWidth: 220,
          }}
        >
          {matches.map((e) => (
            <button
              key={e.id}
              type="button"
              className="navbtn"
              onClick={() => pick(e)}
              style={
                e.id === selectedId
                  ? { background: "var(--dc-accent-100)", color: "var(--dc-accent-800)" }
                  : undefined
              }
            >
              {e.name}
            </button>
          ))}
        </div>
      )}
      {open && q && matches.length === 0 && (
        <div
          className="absolute left-0 top-full z-10 mt-1 p-2.5 text-sm text-muted"
          style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-divider)", boxShadow: "var(--dc-shadow-lg)", minWidth: 220 }}
        >
          Keine Übung gefunden.
        </div>
      )}
    </div>
  );
}
