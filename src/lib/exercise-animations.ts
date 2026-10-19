// Small schematic exercise animations ("zum Erinnern"): a side-view line
// figure driven by keyframed segment angles. Each angle is the absolute
// direction of a segment from its proximal to its distal joint, in degrees
// measured clockwise from straight up (90 = facing right/forward, 180 = down).
// Positions are solved from the hip outwards, then the whole figure is shifted
// so the exercise's anchor joint (e.g. the planted ankle) stays put.
// Angles interpolate linearly, so a value like -5 instead of 355 picks the
// direction a limb turns between two frames.

export type Seg =
  | "trunk" | "neck"
  | "thigh" | "shin" | "foot"
  | "thigh2" | "shin2" | "foot2"
  | "upper" | "fore"
  | "upper2" | "fore2";

export type Joint =
  | "hip" | "shoulder" | "head"
  | "knee" | "ankle" | "toe"
  | "knee2" | "ankle2" | "toe2"
  | "elbow" | "wrist"
  | "elbow2" | "wrist2";

export type Pose = Partial<Record<Seg, number>> & { lift?: number };
export type Point = { x: number; y: number };
export type Joints = Record<Joint, Point>;

export type Shape =
  | { kind: "line"; a: Point; b: Point; tone: Tone; width?: number }
  | { kind: "circle"; c: Point; r: number; tone: Tone; fill?: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; tone: Tone };
export type Tone = "equip" | "ground" | "guide";

export type ExerciseAnimation = {
  label: string;
  anchor: Joint;
  anchorAt: Point;
  frames: Pose[];
  // Seconds to move from frame i to frame i+1 (the last entry returns to frame 0).
  moves: number[];
  // Seconds to stay on frame i before moving on.
  holds: number[];
  // Draw the far-side arm/leg (only when they move differently from the near side).
  farArm?: boolean;
  farLeg?: boolean;
  // Contact points that must not slide (hands on the floor, back foot on the
  // bench). The middle joint (elbow / knee) is solved so the end lands here.
  pins?: { wrist?: Point; ankle2?: Point };
  props?: (j: Joints) => Shape[];
};

export const LEN = { trunk: 50, neck: 15, thigh: 44, shin: 43, foot: 13, upper: 29, fore: 27 } as const;
export const HEAD_R = 8.5;

const STAND: Required<Omit<Pose, "lift">> = {
  trunk: 0, neck: 0,
  thigh: 180, shin: 180, foot: 92,
  thigh2: 180, shin2: 180, foot2: 92,
  upper: 180, fore: 180,
  upper2: 180, fore2: 180,
};

function dir(deg: number, len: number): Point {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r) * len, y: -Math.cos(r) * len };
}
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export function fullPose(p: Pose): Required<Omit<Pose, "lift">> {
  const s = { ...STAND, ...p };
  // Unless given separately, the far limbs mirror the near ones.
  if (p.thigh2 === undefined) s.thigh2 = s.thigh;
  if (p.shin2 === undefined) s.shin2 = s.shin;
  if (p.foot2 === undefined) s.foot2 = s.foot;
  if (p.upper2 === undefined) s.upper2 = s.upper;
  if (p.fore2 === undefined) s.fore2 = s.fore;
  return s;
}

export function solve(anim: ExerciseAnimation, pose: Pose): Joints {
  const a = fullPose(pose);
  const hip = { x: 0, y: 0 };
  const shoulder = add(hip, dir(a.trunk, LEN.trunk));
  const head = add(shoulder, dir(a.neck, LEN.neck));
  const knee = add(hip, dir(a.thigh, LEN.thigh));
  const ankle = add(knee, dir(a.shin, LEN.shin));
  const toe = add(ankle, dir(a.foot, LEN.foot));
  const knee2 = add(hip, dir(a.thigh2, LEN.thigh));
  const ankle2 = add(knee2, dir(a.shin2, LEN.shin));
  const toe2 = add(ankle2, dir(a.foot2, LEN.foot));
  const elbow = add(shoulder, dir(a.upper, LEN.upper));
  const wrist = add(elbow, dir(a.fore, LEN.fore));
  const elbow2 = add(shoulder, dir(a.upper2, LEN.upper));
  const wrist2 = add(elbow2, dir(a.fore2, LEN.fore));
  const j: Joints = { hip, shoulder, head, knee, ankle, toe, knee2, ankle2, toe2, elbow, wrist, elbow2, wrist2 };
  const ref = j[anim.anchor];
  const dx = anim.anchorAt.x - ref.x;
  const dy = anim.anchorAt.y - ref.y - (pose.lift ?? 0);
  for (const k of Object.keys(j) as Joint[]) j[k] = { x: j[k].x + dx, y: j[k].y + dy };
  if (anim.pins?.wrist) {
    j.elbow = middleJoint(j.shoulder, anim.pins.wrist, LEN.upper, LEN.fore, j.elbow);
    j.wrist = anim.pins.wrist;
  }
  if (anim.pins?.ankle2) {
    j.knee2 = middleJoint(j.hip, anim.pins.ankle2, LEN.thigh, LEN.shin, j.knee2);
    j.ankle2 = anim.pins.ankle2;
    j.toe2 = add(j.ankle2, dir(a.foot2, LEN.foot));
  }
  // Hidden far limbs simply follow the near ones.
  if (!anim.farArm) Object.assign(j, { elbow2: j.elbow, wrist2: j.wrist });
  if (!anim.farLeg) Object.assign(j, { knee2: j.knee, ankle2: j.ankle, toe2: j.toe });
  return j;
}

// Two-segment IK: the joint between `from` and `to` at distances r1/r2, on the
// side nearer to `hint` (the position the keyframed angles would give).
export function middleJoint(from: Point, to: Point, r1: number, r2: number, hint: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(r1 - r2) + 1e-6), r1 + r2);
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
  const mx = from.x + ux * a;
  const my = from.y + uy * a;
  const p1 = { x: mx - uy * h, y: my + ux * h };
  const p2 = { x: mx + uy * h, y: my - ux * h };
  const dist = (p: Point) => Math.hypot(p.x - hint.x, p.y - hint.y);
  return dist(p1) <= dist(p2) ? p1 : p2;
}

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

export function cycleLength(anim: ExerciseAnimation): number {
  return anim.frames.reduce((sum, _f, i) => sum + (anim.holds[i] ?? 0) + (anim.moves[i] ?? 0), 0);
}

// Pose at time t (seconds, wraps around the cycle).
export function poseAt(anim: ExerciseAnimation, t: number): Pose {
  const total = cycleLength(anim);
  let rest = total > 0 ? ((t % total) + total) % total : 0;
  const n = anim.frames.length;
  for (let i = 0; i < n; i++) {
    const hold = anim.holds[i] ?? 0;
    if (rest < hold || n === 1) return anim.frames[i];
    rest -= hold;
    const move = anim.moves[i] ?? 0;
    if (rest < move) {
      const from = fullPose(anim.frames[i]);
      const to = fullPose(anim.frames[(i + 1) % n]);
      const k = ease(rest / move);
      const out: Pose = {};
      for (const key of Object.keys(from) as Seg[]) out[key] = from[key] + (to[key] - from[key]) * k;
      out.lift = (anim.frames[i].lift ?? 0) + ((anim.frames[(i + 1) % n].lift ?? 0) - (anim.frames[i].lift ?? 0)) * k;
      return out;
    }
    rest -= move;
  }
  return anim.frames[0];
}

// Reusable equipment ---------------------------------------------------------

const FLOOR = 0;
const floor = (x1: number, x2: number): Shape => ({ kind: "line", a: { x: x1, y: FLOOR }, b: { x: x2, y: FLOOR }, tone: "ground", width: 2 });
const plate = (c: Point, r = 19): Shape[] => [
  { kind: "circle", c, r, tone: "equip" },
  { kind: "circle", c, r: 2.5, tone: "equip", fill: true },
];
const box = (x: number, y: number, w: number, h: number): Shape => ({ kind: "rect", x, y, w, h, tone: "equip" });

// Point on the back side of the trunk, `back` units behind and `up` along it.
function onBack(j: Joints, along: number, back: number): Point {
  const dx = j.shoulder.x - j.hip.x;
  const dy = j.shoulder.y - j.hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Normal pointing to the figure's back (left when facing right and upright).
  return { x: j.hip.x + ux * along + uy * back, y: j.hip.y + uy * along - ux * back };
}

// Exercises ------------------------------------------------------------------

const ANKLE_UP = { x: 0, y: -6 };
const line = (a: Point, b: Point, tone: Tone = "equip", width?: number): Shape => ({ kind: "line", a, b, tone, width });
const dot = (c: Point, r = 3.5): Shape => ({ kind: "circle", c, r, tone: "equip", fill: true });
const flatBench = (x1: number, x2: number, top: number): Shape[] => [
  box(x1, top, x2 - x1, 6),
  line({ x: x1 + 8, y: top + 6 }, { x: x1 + 8, y: FLOOR }),
  line({ x: x2 - 8, y: top + 6 }, { x: x2 - 8, y: FLOOR }),
];

export const EXERCISE_ANIMATIONS: Record<string, ExerciseAnimation> = {
  kniebeuge: {
    label: "Kniebeuge",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 6, shin: 182, thigh: 180, upper: 213, fore: 22 },
      { trunk: 42, shin: 212, thigh: 100, upper: 249, fore: 58 },
    ],
    moves: [1.4, 1.0],
    holds: [0.5, 0.15],
    props: (j) => [floor(-55, 55), ...plate(onBack(j, LEN.trunk - 3, 6))],
  },
  bankdruecken: {
    label: "Bankdrücken",
    anchor: "shoulder",
    anchorAt: { x: 0, y: -55 },
    frames: [
      { trunk: 270, neck: 270, thigh: 98, shin: 180, foot: 92, upper: 8, fore: 0 },
      { trunk: 270, neck: 270, thigh: 98, shin: 180, foot: 92, upper: 118, fore: -5 },
    ],
    moves: [1.4, 1.0],
    holds: [0.5, 0.15],
    props: (j) => [floor(-40, 110), ...flatBench(-26, 68, -48), ...plate(j.wrist)],
  },
  kreuzheben: {
    label: "Kreuzheben",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 67.6, thigh: 102.9, shin: 198, upper: 192, fore: 192 },
      { trunk: 0, thigh: 180, shin: 181, upper: 180, fore: 180 },
    ],
    moves: [1.2, 1.4],
    holds: [0.4, 0.4],
    props: (j) => [floor(-55, 60), ...plate(j.wrist, 20)],
  },
  slrdl: {
    label: "Einbeiniges Kreuzheben (SLRDL)",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    farLeg: true,
    frames: [
      { trunk: 0, thigh: 178, shin: 182, thigh2: 192, shin2: 198, foot2: 130, upper: 180, fore: 180 },
      { trunk: 82, thigh: 166, shin: 191, thigh2: 262, shin2: 262, foot2: 175, upper: 182, fore: 182 },
    ],
    moves: [1.6, 1.4],
    holds: [0.4, 0.3],
    props: (j) => [floor(-80, 85), line(j.wrist, { x: 62, y: -8 }, "equip", 1.5), dot({ x: 62, y: -8 }, 4), dot(j.wrist, 3)],
  },
  "bulgarian-split-squat": {
    label: "Bulgarian Split Squat",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    pins: { ankle2: { x: -60, y: -52 } },
    farLeg: true,
    frames: [
      { trunk: 8, thigh: 165, shin: 190, thigh2: 197.4, shin2: 274.2, foot2: 270, upper: 182, fore: 182 },
      { trunk: 18, thigh: 100, shin: 206, thigh2: 205.1, shin2: 336.9, foot2: 270, upper: 186, fore: 186 },
    ],
    moves: [1.3, 1.1],
    holds: [0.4, 0.15],
    props: () => [floor(-95, 45), ...flatBench(-92, -48, -47)],
  },
  klimmzuege: {
    label: "Klimmzüge",
    anchor: "wrist",
    anchorAt: { x: 0, y: -240 },
    frames: [
      { trunk: 358, neck: 0, thigh: 172, shin: 200, foot: 160, upper: 358, fore: 0 },
      { trunk: 352, neck: 5, thigh: 160, shin: 196, foot: 160, upper: 127.5, fore: -28.8 },
    ],
    moves: [1.1, 1.4],
    holds: [0.4, 0.3],
    props: () => [
      line({ x: -30, y: -240 }, { x: 0, y: -240 }, "equip", 3),
      line({ x: -30, y: -252 }, { x: -30, y: -228 }, "equip", 3),
      dot({ x: 0, y: -240 }, 4),
    ],
  },
  latzug: {
    label: "Latzug",
    anchor: "hip",
    anchorAt: { x: 0, y: -48 },
    frames: [
      { trunk: 350, thigh: 90, shin: 180, foot: 92, upper: 10, fore: 5 },
      { trunk: 345, thigh: 90, shin: 180, foot: 92, upper: 165, fore: 15 },
    ],
    moves: [1.0, 1.4],
    holds: [0.4, 0.3],
    props: (j) => [
      floor(-40, 75),
      box(-22, -43, 40, 5),
      line({ x: -2, y: -38 }, { x: -2, y: FLOOR }),
      box(34, -64, 20, 5),
      line({ x: 0, y: -176 }, j.wrist, "equip", 1.5),
      dot({ x: 0, y: -176 }, 5),
      line({ x: j.wrist.x - 14, y: j.wrist.y }, { x: j.wrist.x + 14, y: j.wrist.y }, "equip", 3.5),
    ],
  },
  "rudern-langhantel": {
    label: "Rudern (Langhantel)",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 65, thigh: 135, shin: 192, upper: 195, fore: 195 },
      { trunk: 65, thigh: 135, shin: 192, upper: 265, fore: 180 },
    ],
    moves: [0.9, 1.4],
    holds: [0.3, 0.4],
    props: (j) => [floor(-55, 60), ...plate(j.wrist)],
  },
  liegestuetz: {
    label: "Liegestütz",
    anchor: "toe",
    anchorAt: { x: 0, y: 0 },
    pins: { wrist: { x: -123.5, y: -5.3 } },
    frames: [
      { trunk: 291, neck: 285, thigh: 111, shin: 111, foot: 200, upper: 180, fore: 180 },
      { trunk: 275, neck: 272, thigh: 95, shin: 95, foot: 200, upper: 94, fore: 227 },
    ],
    moves: [1.3, 1.0],
    holds: [0.4, 0.15],
    props: () => [floor(-160, 20)],
  },
  thrusters: {
    label: "Thrusters",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 2, thigh: 180, shin: 181, upper: 100, fore: -40 },
      { trunk: 22, thigh: 98, shin: 214, upper: 100, fore: -40 },
      { trunk: 0, thigh: 180, shin: 180, upper: 3, fore: 2 },
    ],
    moves: [1.0, 0.7, 0.8],
    holds: [0.3, 0.1, 0.5],
    props: (j) => [floor(-55, 60), ...plate(j.wrist)],
  },
  "dead-bug": {
    label: "Dead Bug",
    anchor: "hip",
    anchorAt: { x: 0, y: -9 },
    farArm: true,
    farLeg: true,
    frames: [
      { trunk: 270, neck: 270, thigh: 0, shin: 90, foot: 5, upper: 0, fore: 0 },
      { trunk: 270, neck: 270, thigh: 0, shin: 90, foot: 5, thigh2: 84, shin2: 84, foot2: 30, upper: -88, fore: -88, upper2: 0, fore2: 0 },
      { trunk: 270, neck: 270, thigh: 0, shin: 90, foot: 5, upper: 0, fore: 0 },
      { trunk: 270, neck: 270, thigh: 84, shin: 84, foot: 30, thigh2: 0, shin2: 90, foot2: 5, upper: 0, fore: 0, upper2: -88, fore2: -88 },
    ],
    moves: [1.3, 1.1, 1.3, 1.1],
    holds: [0.3, 0.5, 0.3, 0.5],
    props: () => [floor(-120, 100)],
  },
  cmj: {
    label: "Countermovement Jump",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 2, upper: 180, fore: 180 },
      { trunk: 38, thigh: 118, shin: 208, upper: 232, fore: 228 },
      { trunk: 4, thigh: 182, shin: 178, foot: 150, upper: 20, fore: 15, lift: 5 },
      { trunk: 4, thigh: 182, shin: 178, foot: 155, upper: 15, fore: 10, lift: 34 },
      { trunk: 24, thigh: 140, shin: 200, upper: 140, fore: 130 },
    ],
    moves: [0.6, 0.22, 0.28, 0.3, 0.7],
    holds: [0.7, 0.05, 0, 0, 0.3],
    props: () => [floor(-55, 60)],
  },
  plank: {
    label: "Plank (Unterarmstütz)",
    anchor: "toe",
    anchorAt: { x: 0, y: 0 },
    frames: [
      { trunk: 278.7, neck: 276, thigh: 98.7, shin: 98.7, foot: 200, upper: 180, fore: 270 },
      { trunk: 278.7, neck: 276, thigh: 98.7, shin: 98.7, foot: 200, upper: 180, fore: 270 },
    ],
    moves: [0, 0],
    holds: [2, 0],
    props: () => [floor(-175, 20)],
  },
  "pallof-press": {
    label: "Pallof Press",
    anchor: "ankle",
    anchorAt: ANKLE_UP,
    frames: [
      { trunk: 4, thigh: 168, shin: 192, upper: 165, fore: 35 },
      { trunk: 4, thigh: 168, shin: 192, upper: 95, fore: 92 },
    ],
    moves: [1.0, 1.0],
    holds: [0.5, 1.4],
    props: (j) => [
      floor(-70, 75),
      line({ x: -58, y: -150 }, { x: -58, y: FLOOR }, "ground", 6),
      line({ x: -58, y: j.shoulder.y + 8 }, j.wrist, "equip", 1.5),
      dot({ x: -58, y: j.shoulder.y + 8 }, 4.5),
      dot(j.wrist, 3),
    ],
  },
};

// Drawing list ---------------------------------------------------------------

export type Draw =
  | { kind: "line"; a: Point; b: Point; tone: Tone | "body" | "far"; width?: number }
  | { kind: "poly"; pts: Point[]; tone: "body" | "far" }
  | { kind: "circle"; c: Point; r: number; tone: Tone | "body"; fill?: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; tone: Tone };

export function drawList(anim: ExerciseAnimation, j: Joints): Draw[] {
  const out: Draw[] = [];
  const props = anim.props?.(j) ?? [];
  // Ground and equipment behind the figure, the far limbs behind the body.
  for (const s of props) if (s.tone !== "guide") out.push(s);
  if (anim.farLeg) out.push({ kind: "poly", pts: [j.hip, j.knee2, j.ankle2, j.toe2], tone: "far" });
  if (anim.farArm) out.push({ kind: "poly", pts: [j.shoulder, j.elbow2, j.wrist2], tone: "far" });
  out.push({ kind: "poly", pts: [j.hip, j.knee, j.ankle, j.toe], tone: "body" });
  out.push({ kind: "poly", pts: [j.head, j.shoulder, j.hip], tone: "body" });
  out.push({ kind: "circle", c: j.head, r: HEAD_R, tone: "body", fill: true });
  out.push({ kind: "poly", pts: [j.shoulder, j.elbow, j.wrist], tone: "body" });
  for (const s of props) if (s.tone === "guide") out.push(s);
  return out;
}

// Bounding box over a whole cycle, for a steady viewBox.
export function cycleBounds(anim: ExerciseAnimation, samples = 48) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const total = cycleLength(anim) || 1;
  const grow = (p: Point, r = 0) => {
    minX = Math.min(minX, p.x - r); maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r); maxY = Math.max(maxY, p.y + r);
  };
  for (let i = 0; i < samples; i++) {
    const j = solve(anim, poseAt(anim, (total * i) / samples));
    for (const d of drawList(anim, j)) {
      if (d.kind === "line") { grow(d.a); grow(d.b); }
      else if (d.kind === "poly") d.pts.forEach((p) => grow(p));
      else if (d.kind === "circle") grow(d.c, d.r);
      else { grow({ x: d.x, y: d.y }); grow({ x: d.x + d.w, y: d.y + d.h }); }
    }
  }
  return { minX, minY, maxX, maxY };
}
