const DAY_PX = 7;
const ROW_HEIGHT = 40;
const PALETTE = ["var(--dc-accent)", "var(--dc-accent-2-500)", "var(--dc-neutral-400)", "var(--dc-accent-700)"];
const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

type TimelineMesocycle = { id: string; title: string; start_date: string; weeks: number };

// Pure calendar-date arithmetic (no timezone involved, these are plain
// YYYY-MM-DD strings) — day-diff and month-add are the two operations this
// Gantt-style layout needs that src/lib/date.ts doesn't already provide.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function monthStart(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function addMonths(dateStr: string, n: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Horizontal timeline (one row per Mesozyklus, a bar spanning its
// Startdatum..+Wochen) across the months the selected scope's cycles cover —
// the "kann ich auf einen Blick sehen, welche Phase wann ist"-Ansicht.
export function MesocycleTimeline({ mesocycles, todayIso }: { mesocycles: TimelineMesocycle[]; todayIso: string }) {
  if (mesocycles.length === 0) {
    return <p className="mt-3 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>;
  }

  const withEnd = mesocycles.map((m) => ({ ...m, endDateExclusive: addDays(m.start_date, m.weeks * 7) }));
  const rangeStart = monthStart(withEnd.reduce((min, m) => (m.start_date < min ? m.start_date : min), withEnd[0].start_date));
  const latestEnd = withEnd.reduce((max, m) => (m.endDateExclusive > max ? m.endDateExclusive : max), withEnd[0].endDateExclusive);
  const rangeEnd = addMonths(monthStart(addDays(latestEnd, -1)), 1);
  const totalDays = daysBetween(rangeStart, rangeEnd);

  const months: { label: string; offsetDays: number; widthDays: number }[] = [];
  let cursor = rangeStart;
  while (cursor < rangeEnd) {
    const next = addMonths(cursor, 1);
    const [y, m] = cursor.split("-").map(Number);
    months.push({
      label: `${MONTH_LABELS[m - 1]} ${y}`,
      offsetDays: daysBetween(rangeStart, cursor),
      widthDays: daysBetween(cursor, next),
    });
    cursor = next;
  }

  const bodyHeight = withEnd.length * ROW_HEIGHT;
  const todayOffset = todayIso >= rangeStart && todayIso < rangeEnd ? daysBetween(rangeStart, todayIso) : null;

  return (
    <div className="mt-3 overflow-x-auto">
      <div style={{ width: Math.max(totalDays * DAY_PX, 600) }}>
        <div style={{ position: "relative", height: 22 }}>
          {months.map((mo) => (
            <div
              key={mo.label}
              className="text-[10px] uppercase"
              style={{
                position: "absolute",
                left: mo.offsetDays * DAY_PX,
                width: mo.widthDays * DAY_PX,
                borderLeft: "1px solid var(--dc-divider)",
                paddingLeft: 4,
                letterSpacing: "0.06em",
                color: "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {mo.label}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", height: bodyHeight }}>
          {months.map((mo) => (
            <div
              key={mo.label}
              style={{
                position: "absolute",
                left: mo.offsetDays * DAY_PX,
                top: 0,
                height: bodyHeight,
                borderLeft: "1px solid var(--dc-divider)",
              }}
            />
          ))}
          {todayOffset != null && (
            <div
              style={{
                position: "absolute",
                left: todayOffset * DAY_PX,
                top: 0,
                height: bodyHeight,
                width: 2,
                background: "var(--dc-accent-2-700)",
              }}
              title="Heute"
            />
          )}
          {withEnd.map((m, i) => {
            const offsetDays = daysBetween(rangeStart, m.start_date);
            const widthDays = m.weeks * 7;
            return (
              <div key={m.id} style={{ position: "relative", height: ROW_HEIGHT }}>
                <div
                  className="text-[12px]"
                  style={{
                    position: "absolute",
                    left: offsetDays * DAY_PX,
                    width: Math.max(widthDays * DAY_PX, 60),
                    top: 6,
                    height: ROW_HEIGHT - 12,
                    background: PALETTE[i % PALETTE.length],
                    color: "var(--dc-bg)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`${m.title} · ${m.weeks} Wochen`}
                >
                  {m.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
