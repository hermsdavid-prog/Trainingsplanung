// Numbers as Germans read them: decimal comma, at most two decimals
// (82.5 -> "82,5", 1173 -> "1.173").
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}
