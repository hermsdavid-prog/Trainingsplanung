"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Dropdown-based Gruppe/Athlet filter for the Gesundheit page, mirroring the
// select-based AthletikFilters on the Statistik page — the chip-row
// HealthGroupFilter (still used standalone on the Wochenbericht, which has
// no per-athlete drill-down) got harder to scan as the roster grew.
export function HealthFilters({
  groups,
  athletes,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
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
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {athletes.length > 0 && (
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
    </div>
  );
}
