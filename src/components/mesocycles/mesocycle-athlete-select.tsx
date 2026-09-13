"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// A blank/"Alle Athleten" option keeps this usable as a page-wide filter
// (see trainer/mesocycles/page.tsx) — clearing it goes back to showing
// every athlete's personal Mesozyklen instead of narrowing to one.
export function MesocycleAthleteSelect({
  athletes,
  selectedAthlete,
  allowAll = false,
}: {
  athletes: { id: string; full_name: string }[];
  selectedAthlete: string | undefined;
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="field w-auto max-w-[280px]">
      <label htmlFor="mesocycle-athlete-select">Athlet</label>
      <select
        id="mesocycle-athlete-select"
        className="input"
        value={selectedAthlete ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("athlete", e.target.value);
          else params.delete("athlete");
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {allowAll && <option value="">Alle Athleten</option>}
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
