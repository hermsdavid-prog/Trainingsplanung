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
  // VBT only.
  velocity?: number | null;
  velocityLast?: number | null;
  // Session row the set belongs to, to clear its "wartet" mark after sending.
  itemId: string;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "offline-sets:";
const keyFor = (planId: string) => `${PREFIX}${planId}`;

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

export function browserStorage(): globalThis.Storage | null {
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

// Plans that still have sets waiting on this device (any plan, not only the
// one currently open).
export function queuedPlanIds(storage: (Storage & Pick<globalThis.Storage, "key" | "length">) | null): string[] {
  if (!storage) return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) ids.push(key.slice(PREFIX.length));
    }
  } catch {
    // storage unavailable
  }
  return ids;
}

export type FlushResult = { sent: number; error: string | null; remaining: number };
type SendResult = { error?: string | null };

// One flush per plan at a time: the training page and the app shell both
// flush on "online", and the same set must not be sent twice in parallel.
const inFlight = new Map<string, Promise<FlushResult>>();

// Sends a plan's queued sets, oldest first. Stops at the first failure: no
// connection (tried again on the next "online") or a refusal such as an
// expired login (returned as `error`, the sets stay queued). Resolves to
// null when another flush of the plan was already running (after it ends).
export async function flushQueuedSets(
  storage: Storage | null,
  planId: string,
  send: (q: QueuedSet) => Promise<SendResult>,
  onSent?: (q: QueuedSet, remaining: number) => void
): Promise<FlushResult | null> {
  const running = inFlight.get(planId);
  if (running) {
    await running.catch(() => null);
    return null;
  }
  const run = (async (): Promise<FlushResult> => {
    let remaining = readQueue(storage, planId);
    let sent = 0;
    for (const q of [...remaining]) {
      // Corrected or re-saved online since the flush started: the queued copy
      // is stale and must not overwrite the newer value.
      const current = readQueue(storage, planId);
      if (!current.some((x) => JSON.stringify(x) === JSON.stringify(q))) {
        remaining = current;
        continue;
      }
      let res: SendResult;
      try {
        res = await send(q);
      } catch {
        break;
      }
      if (res.error) return { sent, error: res.error, remaining: remaining.length };
      remaining = removeQueuedSet(storage, planId, q);
      sent += 1;
      onSent?.(q, remaining.length);
    }
    return { sent, error: null, remaining: remaining.length };
  })();
  inFlight.set(planId, run);
  try {
    return await run;
  } finally {
    inFlight.delete(planId);
  }
}
