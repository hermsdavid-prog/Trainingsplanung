import { reschedulePlanAction, duplicatePlanToDateAction } from "@/lib/actions/plans";
import { rescheduleEventAction, duplicateEventToDateAction } from "@/lib/actions/events";

// Moves or copies one calendar card to `day`. An event card can stand for
// several per-group rows (merged in the calendar), which all go together.
export async function moveOrCopyCalendarItem(
  kind: "plan" | "event",
  ids: string[],
  day: string,
  copy: boolean
): Promise<{ error?: string }> {
  if (kind === "plan") {
    return copy ? duplicatePlanToDateAction(ids[0], day) : reschedulePlanAction(ids[0], day);
  }
  for (const id of ids) {
    const result = copy ? await duplicateEventToDateAction(id, day) : await rescheduleEventAction(id, day);
    if (result.error) return result;
  }
  return {};
}
