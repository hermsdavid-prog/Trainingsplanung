"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertExerciseResultAction } from "@/lib/actions/exercise-results";
import {
  browserStorage,
  flushQueuedSets,
  isOffline,
  queuedPlanIds,
  type QueuedSet,
} from "@/lib/offline-queue";

export function sendQueuedSet(planId: string, q: QueuedSet) {
  return upsertExerciseResultAction(
    q.exerciseId,
    q.date,
    q.setNumber,
    q.weight,
    q.reps,
    q.unit,
    planId,
    q.setType,
    q.rir,
    q.side,
    q.contactMs ?? null,
    q.rsi ?? null,
    q.velocity ?? null,
    q.velocityLast ?? null
  );
}

export function sentToast(sent: number) {
  toast.success(`${sent} offline eingetragene${sent === 1 ? "r Satz" : " Sätze"} gespeichert.`);
}

// Mounted in the athlete shell: sets logged offline go out as soon as there
// is a connection again, on whatever page the athlete is (not only when the
// same training is opened again).
export function OfflineSync() {
  const router = useRouter();

  useEffect(() => {
    async function flushAll() {
      if (isOffline()) return;
      const storage = browserStorage();
      let sent = 0;
      for (const planId of queuedPlanIds(storage)) {
        const res = await flushQueuedSets(storage, planId, (q) => sendQueuedSet(planId, q));
        if (!res) continue;
        sent += res.sent;
        if (res.error) {
          toast.error(`Offline eingetragene Sätze konnten nicht gespeichert werden: ${res.error}`);
          break;
        }
      }
      if (sent > 0) {
        sentToast(sent);
        router.refresh();
      }
    }
    const onOnline = () => void flushAll();
    const t = setTimeout(onOnline, 0);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", onOnline);
    };
  }, [router]);

  return null;
}
