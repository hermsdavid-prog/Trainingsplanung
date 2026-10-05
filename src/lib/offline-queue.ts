// Sets logged while the phone has no connection (basement gyms) are kept on
// the device and sent once it's back online, instead of failing with an
// error and getting lost. One queue per plan, stored in localStorage so it
// also survives closing the tab.
import type { Side } from "@/lib/per-side";

export type QueuedSet = {
  exerciseId: string;
  date: string;
  setNumber: number;
  weight: number;
  reps: number | null;
  unit: string;
  setType: "aufwaermsatz" | "arbeitssatz";
  rir: number | null;
  side: Side | null;
  // Jump tests only (older queued entries don't have them).
  contactMs?: number | null;
  rsi?: number | null;
  // Session row the set belongs to, to clear its "wartet" mark after sending.
  itemId: string;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

const keyFor = (planId: string) => `offline-sets:${planId}`;

// The same set saved twice while offline (e.g. RIR added) replaces the
// earlier entry instead of being sent twice.
const sameSet = (a: QueuedSet, b: QueuedSet) =>
  a.exerciseId === b.exerciseId && a.date === b.date && a.setNumber === b.setNumber;

export function readQueue(storage: Storage | null, planId: string): QueuedSet[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(keyFor(planId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedSet[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(storage: Storage | null, planId: string, queue: QueuedSet[]) {
  if (!storage) return;
  try {
    if (queue.length === 0) storage.removeItem(keyFor(planId));
    else storage.setItem(keyFor(planId), JSON.stringify(queue));
  } catch {
    // storage full or unavailable — the set stays marked as waiting
  }
}

export function enqueueSet(storage: Storage | null, planId: string, entry: QueuedSet): QueuedSet[] {
  const queue = [...readQueue(storage, planId).filter((q) => !sameSet(q, entry)), entry];
  writeQueue(storage, planId, queue);
  return queue;
}

export function removeQueuedSet(storage: Storage | null, planId: string, entry: QueuedSet): QueuedSet[] {
  const queue = readQueue(storage, planId).filter((q) => !sameSet(q, entry));
  writeQueue(storage, planId, queue);
  return queue;
}

export function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// A server action that can't reach the server rejects (fetch failed) rather
// than returning { error } — that, or the browser saying it's offline, is
// what counts as "no connection".
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
