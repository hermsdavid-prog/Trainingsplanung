// Velocity-based training (VBT). A plan row switches it on in its reps text,
// like "je Seite": "3 Wdh. · VBT 0,55-0,65 m/s · max. 20 % Verlust". The
// athlete logs the mean concentric velocity of the fastest rep (and
// optionally the last rep) per set, read from the sensor app.
//
// From the logged sets the load-velocity profile is a straight line
// (velocity falls linearly with load, González-Badillo & Sánchez-Medina
// 2010): it estimates the 1RM at a minimal velocity threshold (MVT), the
// load that matches a target velocity, and today's readiness from how far a
// set lies above or below the line.

export type VbtSpec = {
  on: boolean;
  targetMin: number | null;
  targetMax: number | null;
  // Maximal velocity loss within a set in percent (e.g. 20).
  lossLimit: number | null;
};

const VBT_MARK = /\bvbt\b/i;
const num = (s: string) => Number(s.replace(",", "."));
const NUM = "\\d+(?:[.,]\\d+)?";

export function vbtSpec(spec: string | null | undefined): VbtSpec {
  const text = spec ?? "";
  const on = VBT_MARK.test(text);
  if (!on) return { on: false, targetMin: null, targetMax: null, lossLimit: null };
  const range = text.match(new RegExp(`(${NUM})(?:\\s*[-–]\\s*|\\s+bis\\s+)(${NUM})\\s*m\\/s`, "i"));
  const single = range ? null : text.match(new RegExp(`(${NUM})\\s*m\\/s`, "i"));
  const loss = text.match(new RegExp(`(?:^|[^\\d.,])(${NUM})\\s*%\\s*(?:geschwindigkeits)?verlust`, "i"));
  const a = range ? num(range[1]) : single ? num(single[1]) : null;
  const b = range ? num(range[2]) : single ? num(single[1]) : null;
  return {
    on,
    targetMin: a != null && b != null ? Math.min(a, b) : null,
    targetMax: a != null && b != null ? Math.max(a, b) : null,
    lossLimit: loss ? num(loss[1]) : null,
  };
}

// The editor's "VBT" switch: adds or removes the marker (targets stay in
// the text the trainer writes after it).
export function withVbt(spec: string, on: boolean): string {
  if (on) return VBT_MARK.test(spec) ? spec : `${spec.trim()} · VBT`.replace(/^ · /, "");
  // Only the marker, its target zone and the loss limit go; anything else
  // in the field ("je Seite", "Pause …") stays.
  return spec
    .replace(new RegExp(`\\s*·?\\s*\\bvbt\\b(?:\\s*${NUM}(?:(?:\\s*[-–]\\s*|\\s+bis\\s+)${NUM})?\\s*m\\/s)?`, "gi"), "")
    .replace(new RegExp(`\\s*·?\\s*(?:max\\.?\\s*)?${NUM}\\s*%\\s*(?:geschwindigkeits)?verlust`, "gi"), "")
    .replace(/^\s*·\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Velocity loss within a set in percent: fastest rep vs. last rep.
export function velocityLoss(best: number | null, last: number | null): number | null {
  // A last rep faster than the first is no loss.
  if (best == null || last == null || !(best > 0) || last < 0 || last > best) return null;
  return Math.round(((best - last) / best) * 1000) / 10;
}

export type Fit = { slope: number; intercept: number; r2: number; n: number; loads: number };

// Least-squares line velocity = intercept + slope × load. Needs at least
// three points over two or more different loads and a falling line.
export function fitLoadVelocity(points: { load: number; velocity: number }[]): Fit | null {
  const pts = points.filter((p) => p.load > 0 && p.velocity > 0);
  const loads = new Set(pts.map((p) => p.load)).size;
  if (pts.length < 3 || loads < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.load, 0) / n;
  const my = pts.reduce((s, p) => s + p.velocity, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    sxx += (p.load - mx) ** 2;
    sxy += (p.load - mx) * (p.velocity - my);
    syy += (p.velocity - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  if (!(slope < 0)) return null;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2, n, loads };
}

export function velocityAt(fit: Fit, load: number): number {
  return fit.intercept + fit.slope * load;
}

export function loadAt(fit: Fit, velocity: number): number {
  return (velocity - fit.intercept) / fit.slope;
}

// Estimated 1RM: the load at which the line reaches the MVT, rounded to
// 0.5 kg.
export function estimateOneRmFromProfile(fit: Fit, mvt: number): number | null {
  const load = loadAt(fit, mvt);
  return Number.isFinite(load) && load > 0 ? Math.round(load * 2) / 2 : null;
}

// Readiness: how much faster (+) or slower (−) a set was than the profile
// predicts for its load, in percent.
export function readiness(fit: Fit, load: number, velocity: number): number | null {
  const expected = velocityAt(fit, load);
  if (!(expected > 0)) return null;
  return Math.round(((velocity - expected) / expected) * 1000) / 10;
}

// Load for a target velocity today: the profile line shifted by today's
// deviation (same slope, intercept moved so the line passes through
// today's set), rounded down to 2.5 kg plates.
export function suggestLoad(
  fit: Fit,
  targetVelocity: number,
  today?: { load: number; velocity: number } | null
): number | null {
  const intercept = today ? today.velocity - fit.slope * today.load : fit.intercept;
  const load = Math.floor((targetVelocity - intercept) / fit.slope / 2.5) * 2.5;
  return Number.isFinite(load) && load > 0 ? load : null;
}

// Typical minimal velocity thresholds (mean velocity at 1RM) as a starting
// point; trainers can set their own in the profile view.
// Mean concentric velocities outside this range are typos ("62" for 0,62).
export function plausibleVelocity(v: number | null): v is number {
  return v != null && Number.isFinite(v) && v >= 0.05 && v <= 3;
}

export function defaultMvt(exerciseName: string): number {
  const n = exerciseName.toLowerCase();
  if (/bank|bench/.test(n)) return 0.17;
  if (/kreuzheben|deadlift/.test(n) && !/rumän|rdl/.test(n)) return 0.15;
  if (/rudern|row|pull/.test(n)) return 0.5;
  return 0.3; // Kniebeuge and similar
}
