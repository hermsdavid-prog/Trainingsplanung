// Interval timer for circuits and round-based drills: turns the timed rows
// of a plan (Runden and Cardio sections) into a flat list of phases the
// timer screen counts down one after another.

export type TimerItem = {
  id: string;
  name: string;
  workSec: number;
  // "0:20 je Seite": the work phase runs once per side, back to back.
  perSide: boolean;
  restSec: number;
  rounds: number;
  roundRestSec: number;
  // The plan's own wording, shown in the setup list.
  label: string;
};

export type TimerMode = "circuit" | "sequence";

export type TimerPhase = {
  kind: "prepare" | "work" | "rest";
  seconds: number;
  name: string;
  side?: "links" | "rechts";
  // A rest after the last station of a circuit round.
  roundRest?: boolean;
  round: number;
  rounds: number;
  station: number;
  stations: number;
  // Name of the next work phase, for "Als Nächstes".
  next?: string;
};

type TimerSourceRow = {
  id: string;
  exercise_name: string;
  section: string;
  reps_or_duration: string | null;
  sets: string | null;
  rest_time: string | null;
  round_rest: string | null;
};

const PER_SIDE = /\b(je|pro)\s+seite\b/i;

// "0:30", "1:30 Min.", "30 Sek.", "30s", "45 sec", "2 Min.", "1,5 min".
// A bare number is a rep count, not a duration. Ranges take the lower end.
export function parseSeconds(label: string | null | undefined): number | null {
  if (!label) return null;
  const text = label.replace(PER_SIDE, " ");
  const clock = text.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const sec = text.match(/(\d+)\s*(?:-\s*\d+\s*)?(?:sekunden|sek|sec|s)(?![a-zäöüß])/i);
  if (sec) return Number(sec[1]);
  const min = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*\d+\s*)?min/i);
  if (min) return Math.round(Number(min[1].replace(",", ".")) * 60);
  return null;
}

export function toTimerItems(rows: TimerSourceRow[]): TimerItem[] {
  const items: TimerItem[] = [];
  for (const row of rows) {
    if (row.section !== "runden" && row.section !== "cardio") continue;
    const workSec = parseSeconds(row.reps_or_duration);
    if (!workSec || workSec <= 0) continue;
    const rounds = Math.max(1, Math.min(50, Number.parseInt(row.sets ?? "", 10) || 1));
    items.push({
      id: row.id,
      name: row.exercise_name,
      workSec,
      perSide: PER_SIDE.test(row.reps_or_duration ?? ""),
      restSec: parseSeconds(row.rest_time) ?? 0,
      rounds,
      roundRestSec: parseSeconds(row.round_rest) ?? 0,
      label: row.reps_or_duration ?? "",
    });
  }
  return items;
}

// Rows called "Zirkel …" (or described as one) are preselected as a circuit;
// otherwise nothing is, and the user ticks what to run.
export function defaultSelection(items: TimerItem[]): string[] {
  return items.filter((i) => /zirkel/i.test(i.name)).map((i) => i.id);
}

function workPhases(item: TimerItem, base: Omit<TimerPhase, "kind" | "seconds" | "name" | "side">): TimerPhase[] {
  if (!item.perSide) return [{ ...base, kind: "work", seconds: item.workSec, name: item.name }];
  return [
    { ...base, kind: "work", seconds: item.workSec, name: item.name, side: "links" },
    { ...base, kind: "work", seconds: item.workSec, name: item.name, side: "rechts" },
  ];
}

// circuit: every round runs all stations once (station rest between them,
// the round rest after the last one). sequence: each row runs all of its
// rounds before the next row starts.
export function buildPhases(items: TimerItem[], mode: TimerMode, prepareSec = 10): TimerPhase[] {
  const phases: TimerPhase[] = [];
  if (items.length === 0) return phases;

  if (mode === "circuit") {
    const rounds = Math.max(...items.map((i) => i.rounds));
    const roundRestSec = Math.max(0, ...items.map((i) => i.roundRestSec));
    for (let round = 1; round <= rounds; round++) {
      const stations = items.filter((i) => i.rounds >= round);
      stations.forEach((item, idx) => {
        const base = { round, rounds, station: idx + 1, stations: stations.length };
        phases.push(...workPhases(item, base));
        const lastStation = idx === stations.length - 1;
        if (lastStation && roundRestSec > 0) {
          phases.push({ ...base, kind: "rest", seconds: roundRestSec, name: "Rundenpause", roundRest: true });
        } else if (item.restSec > 0) {
          phases.push({ ...base, kind: "rest", seconds: item.restSec, name: "Pause" });
        }
      });
    }
  } else {
    items.forEach((item, idx) => {
      for (let round = 1; round <= item.rounds; round++) {
        const base = { round, rounds: item.rounds, station: idx + 1, stations: items.length };
        phases.push(...workPhases(item, base));
        const rest = item.roundRestSec || item.restSec;
        if (rest > 0) phases.push({ ...base, kind: "rest", seconds: rest, name: "Pause" });
      }
    });
  }

  // No rest after the very last work phase.
  while (phases.length > 0 && phases[phases.length - 1].kind === "rest") phases.pop();

  const first = phases[0];
  phases.unshift({ ...first, kind: "prepare", seconds: prepareSec, name: first.name, side: first.side, roundRest: false });

  // "Als Nächstes": the following work phase, from each phase's point of view.
  let nextWork: TimerPhase | undefined;
  for (let i = phases.length - 1; i >= 0; i--) {
    const phase = phases[i];
    if (nextWork) phase.next = nextWork.side ? `${nextWork.name} (${nextWork.side})` : nextWork.name;
    if (phase.kind === "work") nextWork = phase;
  }
  // The prepare phase announces the first work phase itself, not the one after.
  phases[0].next = undefined;

  return phases;
}

export function totalSeconds(phases: TimerPhase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
