"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Typeahead } from "@/components/ui/typeahead";

// Zwei unabhängige Filterachsen für die Plan-Liste (Athletik/Karate): nach
// Gruppe oder nach Sportler. Da ein Plan entweder gruppen- oder
// athletenbezogen ist, schließen sich beide gegenseitig aus — die Auswahl
// der einen setzt die andere zurück. Buchstaben-Eingabe statt Dropdown,
// damit das bei vielen Gruppen/Sportlern nicht unhandlich wird.
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
      <Typeahead
        key={`group-${selectedGroup ?? "none"}`}
        id="plan-filter-group"
        label="Gruppe"
        items={groups.map((g) => ({ id: g.id, label: g.name }))}
        selectedId={selectedGroup}
        onSelect={(id) => apply({ group: id })}
        allowClear
        clearLabel="Alle Gruppen"
        placeholder="Alle Gruppen"
        emptyMessage="Keine Gruppe gefunden."
      />
      <Typeahead
        key={`athlete-${selectedAthlete ?? "none"}`}
        id="plan-filter-athlete"
        label="Sportler"
        items={athletes.map((a) => ({ id: a.id, label: a.full_name }))}
        selectedId={selectedAthlete}
        onSelect={(id) => apply({ athlete: id })}
        allowClear
        clearLabel="Alle Sportler"
        placeholder="Alle Sportler"
        emptyMessage="Kein Sportler gefunden."
      />
    </div>
  );
}
