"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Minimal velocity threshold for the 1RM estimate, kept in the URL (?mvt=)
// so the profile view and its numbers stay shareable.
export function VbtMvtInput({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(raw: string) {
    const n = Number(raw.replace(",", "."));
    const params = new URLSearchParams(searchParams.toString());
    if (Number.isFinite(n) && n > 0 && n < 2) params.set("mvt", String(n));
    else params.delete("mvt");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: "var(--dc-muted)" }}>
      Geschwindigkeit bei 1RM (MVT)
      <input
        key={value}
        className="input w-20"
        inputMode="decimal"
        defaultValue={value.toFixed(2).replace(".", ",")}
        onBlur={(e) => apply(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply((e.target as HTMLInputElement).value);
        }}
      />
      m/s
    </label>
  );
}
