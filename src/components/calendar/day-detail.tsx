import Link from "next/link";
import { formatDateLabel } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { EventActions } from "@/components/calendar/event-actions";
import type { CalendarItem } from "@/components/calendar/calendar-grid";

export function DayDetail({
  date,
  items,
  canManageEvents = false,
}: {
  date: string;
  items: (CalendarItem & { subtitle?: string; kind: "plan" | "event" })[];
  canManageEvents?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <h2 className="font-medium capitalize">{formatDateLabel(date)}</h2>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Keine Einträge für diesen Tag.</p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
          >
            <Link href={item.href} className="flex flex-1 items-center gap-2 overflow-hidden">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 truncate">
                <span className="font-medium">{item.title}</span>
                {item.subtitle && (
                  <span className="text-muted-foreground"> · {item.subtitle}</span>
                )}
              </span>
              {item.status === "proposed" && <Badge variant="secondary">Vorschlag</Badge>}
              {item.status === "draft" && <Badge variant="secondary">Entwurf</Badge>}
            </Link>
            {canManageEvents && item.kind === "event" && (
              <EventActions eventId={item.id} status={item.status} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
