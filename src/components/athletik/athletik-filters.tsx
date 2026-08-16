"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AthletikFilters({
  athletes,
  exercises,
}: {
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
    <div className="flex flex-wrap gap-2">
      {athletes && (
        <Select
          items={Object.fromEntries(athletes.map((a) => [a.id, a.full_name]))}
          defaultValue={searchParams.get("athlete") ?? athletes[0]?.id}
          onValueChange={(v) => setParam("athlete", String(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Athlet wählen" />
          </SelectTrigger>
          <SelectContent>
            {athletes.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        items={Object.fromEntries(exercises.map((e) => [e.id, e.name]))}
        defaultValue={searchParams.get("exercise") ?? exercises[0]?.id}
        onValueChange={(v) => setParam("exercise", String(v))}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Übung wählen" />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
