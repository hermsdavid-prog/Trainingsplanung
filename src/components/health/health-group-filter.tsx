"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function HealthGroupFilter({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setGroup(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => {
        const active = (searchParams.get("group") ?? groups[0]?.id) === g.id;
        return (
          <button
            key={g.id}
            type="button"
            className="chip"
            onClick={() => setGroup(g.id)}
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
