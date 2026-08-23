"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmEventAction, deleteEventAction } from "@/lib/actions/events";
import { formatDateShort } from "@/lib/date";

export type ProposedEvent = {
  id: string;
  title: string;
  date: string;
  groupName: string;
  proposedBy: string;
};

export function ProposedEventsWidget({ events }: { events: ProposedEvent[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (events.length === 0) return null;

  function confirm(id: string) {
    startTransition(async () => {
      const result = await confirmEventAction(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Termin bestätigt.");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteEventAction(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Vorschlag abgelehnt.");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="kicker-accent-2">
        {events.length} Terminvorschlag{events.length > 1 ? "e" : ""}
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {events.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3.5"
            style={{ background: "var(--dc-accent-100)" }}
          >
            <div className="min-w-0">
              <div className="text-[15px]">{e.title}</div>
              <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                {formatDateShort(e.date)} · {e.groupName} · vorgeschlagen von {e.proposedBy}
              </div>
            </div>
            <div className="flex flex-none gap-2">
              <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => confirm(e.id)}>
                Bestätigen
              </button>
              <button type="button" className="btn btn-ghost" disabled={isPending} onClick={() => remove(e.id)}>
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
