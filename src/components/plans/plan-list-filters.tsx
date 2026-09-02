"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Zwei unabhängige Filterachsen für die Plan-Liste (Athletik/Karate): nach
// Gruppe oder nach Sportler. Da ein Plan entweder gruppen- oder
// athletenbezogen ist, schließen sich beide gegenseitig aus — die Auswahl
// der einen setzt die andere zurück.
export function PlanListFilters({
  groups,
  athletes,
  selectedGroup,
  selectedAthlete,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  selectedGroup: string | undefined;
  selectedAthlete: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(next: { group?: string; athlete?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("group");
    params.delete("athlete");
    if (next.group) params.set("group", next.group);
    if (next.athlete) params.set("athlete", next.athlete);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="field w-auto max-w-[240px]">
        <label htmlFor="plan-filter-group">Gruppe</label>
        <select
          id="plan-filter-group"
          className="input"
          value={selectedGroup ?? ""}
          onChange={(e) => apply({ group: e.target.value })}
        >
          <option value="">Alle Gruppen</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field w-auto max-w-[240px]">
        <label htmlFor="plan-filter-athlete">Sportler</label>
        <select
          id="plan-filter-athlete"
          className="input"
          value={selectedAthlete ?? ""}
          onChange={(e) => apply({ athlete: e.target.value })}
        >
          <option value="">Alle Sportler</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
