"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Select
      items={Object.fromEntries(groups.map((g) => [g.id, g.name]))}
      defaultValue={searchParams.get("group") ?? groups[0]?.id}
      onValueChange={(v) => setGroup(String(v))}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Gruppe wählen" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
