"use client";

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

      <div className="field w-auto">
        <label>Übung</label>
        <select
          className="input"
          defaultValue={searchParams.get("exercise") ?? exercises[0]?.id}
          onChange={(e) => setParam("exercise", e.target.value)}
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
