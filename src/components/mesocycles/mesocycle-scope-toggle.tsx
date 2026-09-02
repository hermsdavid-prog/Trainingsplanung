"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// "Gruppe" vs. "Einzelner Athlet" toggle for the Mesozyklen page — same
// segmented-control markup as the "Für wen?" picker in create-plan-form.tsx.
export function MesocycleScopeToggle({ scope }: { scope: "group" | "athlete" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setScope(next: "group" | "athlete") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", next);
    if (next === "group") params.delete("athlete");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="seg">
      <label className="seg-opt">
        <input type="radio" name="mesocycle_scope" value="group" checked={scope === "group"} onChange={() => setScope("group")} />
        Gruppe
      </label>
      <label className="seg-opt">
        <input type="radio" name="mesocycle_scope" value="athlete" checked={scope === "athlete"} onChange={() => setScope("athlete")} />
        Einzelner Athlet
      </label>
    </div>
  );
}
