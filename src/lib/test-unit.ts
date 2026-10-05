// Leistungsdiagnostik rows ("CMJ", "Drop Jump") name their measure in the
// plan's "Messgröße" field ("cm", "Sek.", "RSI"). The session logs each
// attempt in that unit; a free-text description falls back to cm, the
// usual measure for jump tests.
const KNOWN_UNIT = /(?:^|[\s(])(cm|mm|ms|m\/s|km\/h|m|s|sek\.?|w|%)(?=$|[\s).,])/i;

export function testUnit(spec: string | null | undefined): string {
  const text = (spec ?? "").trim();
  if (!text) return "cm";
  const known = text.match(KNOWN_UNIT);
  if (known) return known[1];
  if (text.length <= 8 && !/\d/.test(text)) return text;
  return "cm";
}
