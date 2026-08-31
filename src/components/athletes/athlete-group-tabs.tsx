"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// The "Auswahlreiter" (tab strip) across all of the trainer's groups on the
// merged Athleten page — picking a group clears the athlete/exercise
// selection since those belong to the previous group.
export function AthleteGroupTabs({
  groups,
  selectedGroup,
}: {
  groups: { id: string; name: string }[];
  selectedGroup: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectGroup(groupId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", groupId);
    params.delete("athlete");
    params.delete("exercise");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
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
