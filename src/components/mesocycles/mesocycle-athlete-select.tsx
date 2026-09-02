"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function MesocycleAthleteSelect({
  athletes,
  selectedAthlete,
}: {
  athletes: { id: string; full_name: string }[];
  selectedAthlete: string | undefined;
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
          params.set("athlete", e.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
