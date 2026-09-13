"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Typeahead } from "@/components/ui/typeahead";

// Same Gruppe/Sportler typeahead-row pattern as PlanListFilters on the
// Athletik/Karate plan lists — but independent axes: unlike a plan (always
// either group- or athlete-scoped), the Mesozyklen overview shows both a
// group's and an athlete's personal cycles at once, so picking one filter
// doesn't clear the other.
export function MesocycleFilters({
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

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Typeahead
        key={`group-${selectedGroup ?? "none"}`}
        id="mesocycle-filter-group"
        label="Gruppe"
        items={groups.map((g) => ({ id: g.id, label: g.name }))}
        selectedId={selectedGroup}
        onSelect={(id) => setParam("group", id)}
        allowClear
        clearLabel="Alle Gruppen"
        placeholder="Alle Gruppen"
        emptyMessage="Keine Gruppe gefunden."
      />
      <Typeahead
        key={`athlete-${selectedAthlete ?? "none"}`}
        id="mesocycle-filter-athlete"
        label="Athlet"
        items={athletes.map((a) => ({ id: a.id, label: a.full_name }))}
        selectedId={selectedAthlete}
        onSelect={(id) => setParam("athlete", id)}
        allowClear
        clearLabel="Alle Athleten"
        placeholder="Alle Athleten"
        emptyMessage="Kein Athlet gefunden."
      />
    </div>
  );
}
