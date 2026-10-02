import { describe, expect, it } from "vitest";
import { enqueueSet, readQueue, removeQueuedSet, type QueuedSet } from "@/lib/offline-queue";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const set = (setNumber: number, weight = 10): QueuedSet => ({
  exerciseId: "e1",
  date: "2026-10-02",
  setNumber,
  weight,
  reps: 8,
  unit: "kg",
  setType: "arbeitssatz",
  rir: null,
  side: null,
  itemId: "i1",
});

describe("offline set queue", () => {
  it("keeps queued sets per plan", () => {
    const s = memoryStorage();
    enqueueSet(s, "p1", set(1));
    enqueueSet(s, "p1", set(2));
    enqueueSet(s, "p2", set(1));
    expect(readQueue(s, "p1").map((q) => q.setNumber)).toEqual([1, 2]);
    expect(readQueue(s, "p2")).toHaveLength(1);
  });

  it("replaces a set saved again while offline", () => {
    const s = memoryStorage();
    enqueueSet(s, "p1", set(1, 10));
    enqueueSet(s, "p1", set(1, 12));
    expect(readQueue(s, "p1")).toEqual([set(1, 12)]);
  });

  it("removes sent sets and clears the key when empty", () => {
    const s = memoryStorage();
    enqueueSet(s, "p1", set(1));
    removeQueuedSet(s, "p1", set(1));
    expect(readQueue(s, "p1")).toEqual([]);
    expect(s.data.size).toBe(0);
  });

  it("survives broken or missing storage", () => {
    const s = memoryStorage();
    s.setItem("offline-sets:p1", "{kaputt");
    expect(readQueue(s, "p1")).toEqual([]);
    expect(readQueue(null, "p1")).toEqual([]);
  });
});
