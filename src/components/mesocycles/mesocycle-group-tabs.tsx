"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function MesocycleGroupTabs({
  groups,
  selectedGroup,
  allowAll = false,
}: {
  groups: { id: string; name: string }[];
  selectedGroup: string | undefined;
  // Group scope's default view stacks every one of the trainer's groups
  // together (see trainer/mesocycles/page.tsx) — this adds an "Alle" chip
  // to get back to that from a single-group filter. Athlete scope always
  // needs one specific group picked (to narrow the athlete list), so it
  // leaves this off.
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectGroup(groupId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (groupId) params.set("group", groupId);
    else params.delete("group");
    params.delete("athlete");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allowAll && (
        <button
          type="button"
          className="chip"
          onClick={() => selectGroup(null)}
          style={{
            background: !selectedGroup ? "var(--dc-accent)" : "transparent",
            color: !selectedGroup ? "var(--dc-bg)" : "var(--dc-text)",
          }}
        >
          Alle
        </button>
      )}
      {groups.map((g) => {
        const active = g.id === selectedGroup;
        return (
          <button
            key={g.id}
            type="button"
            className="chip"
            onClick={() => selectGroup(g.id)}
            style={{
              background: active ? "var(--dc-accent)" : "transparent",
              color: active ? "var(--dc-bg)" : "var(--dc-text)",
              maxWidth: "min(100%, 220px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
