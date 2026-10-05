// Jump tests in the Leistungsdiagnostik can record more than the jump
// height: ground contact time and the Reactive Strength Index (drop jumps,
// pogo jumps). Like "je Seite", the plan's Messgröße text switches them on
// ("cm · Kontaktzeit · RSI"), so copies, templates and series carry it.

export type JumpMetrics = { contact: boolean; rsi: boolean };

const CONTACT = /\b(kontaktzeit|kontakt|bodenkontakt|ms)\b/i;
const RSI = /\brsi\b/i;

export function jumpMetrics(spec: string | null | undefined): JumpMetrics {
  const text = spec ?? "";
  return { contact: CONTACT.test(text), rsi: RSI.test(text) };
}

const TOKEN: Record<keyof JumpMetrics, string> = { contact: "Kontaktzeit", rsi: "RSI" };
const TOKEN_PATTERN: Record<keyof JumpMetrics, RegExp> = {
  contact: /\s*·?\s*\b(kontaktzeit|kontakt|bodenkontakt|ms)\b/gi,
  rsi: /\s*·?\s*\brsi\b/gi,
};

// The editor's "Kontaktzeit" / "RSI" switches: add or remove the marker.
export function withJumpMetric(spec: string, metric: keyof JumpMetrics, on: boolean): string {
  const has = jumpMetrics(spec)[metric];
  if (on) {
    if (has) return spec;
    const base = spec.trim() || "cm";
    return `${base} · ${TOKEN[metric]}`;
  }
  return spec.replace(TOKEN_PATTERN[metric], "").replace(/^\s*·\s*/, "").trim();
}

// RSI = jump height (m) / ground contact time (s) = cm × 10 / ms,
// rounded to two decimals.
export function computeRsi(heightCm: number | null, contactMs: number | null): number | null {
  if (heightCm == null || contactMs == null || !(heightCm > 0) || !(contactMs > 0)) return null;
  return Math.round(((heightCm * 10) / contactMs) * 100) / 100;
}

export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
