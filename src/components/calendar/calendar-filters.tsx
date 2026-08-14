"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CalendarFilters({
  groups,
  athletes,
  eventTypes,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  eventTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("date");
    router.push(`${pathname}?${params.toString()}`);
  }

  const groupItems = { all: "Alle Gruppen", ...Object.fromEntries(groups.map((g) => [g.id, g.name])) };
  const athleteItems = {
    all: "Alle Sportler",
    ...Object.fromEntries(athletes.map((a) => [a.id, a.full_name])),
  };
  const typeItems = {
    all: "Alle Typen",
    training: "Training",
    ...Object.fromEntries(eventTypes.map((t) => [t, t])),
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={groupItems}
        defaultValue={searchParams.get("group") ?? "all"}
        onValueChange={(v) => setParam("group", String(v))}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Gruppen</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={athleteItems}
        defaultValue={searchParams.get("athlete") ?? "all"}
        onValueChange={(v) => setParam("athlete", String(v))}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Sportler</SelectItem>
          {athletes.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={typeItems}
        defaultValue={searchParams.get("type") ?? "all"}
        onValueChange={(v) => setParam("type", String(v))}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Typen</SelectItem>
          <SelectItem value="training">Training</SelectItem>
          {eventTypes.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
