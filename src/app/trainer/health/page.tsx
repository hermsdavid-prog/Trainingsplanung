import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import { computeHealthStatus, HEALTH_STATUS_LABEL, type HealthLog, type HealthStatusLevel } from "@/lib/health-status";
import { TrendChart } from "@/components/health/trend-chart";
import { HealthGroupFilter } from "@/components/health/health-group-filter";

const METRICS: { key: "hrv" | "resting_hr" | "wellbeing"; label: string; unit: string; domain?: [number, number] }[] = [
  { key: "hrv", label: "HRV", unit: "ms" },
  { key: "resting_hr", label: "Ruhe-HF", unit: "Schläge/min" },
  { key: "wellbeing", label: "Wohlbefinden", unit: "von 10", domain: [1, 10] },
];

const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function TrainerHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; athlete?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const rangeStart = shiftDateISO(today, -30);

  const supabase = await createClient();

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  const selectedGroup =
    params.group && (groups ?? []).some((g) => g.id === params.group)
      ? params.group
      : groups?.[0]?.id;

  const { data: groupAthleteRows } = selectedGroup
    ? await supabase
        .from("group_athletes")
        .select("athlete_id, profiles(full_name)")
        .eq("group_id", selectedGroup)
    : { data: [] };

  const athletes = (groupAthleteRows ?? [])
    .filter((row) => row.profiles?.full_name)
    .map((row) => ({ id: row.athlete_id, full_name: row.profiles!.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const athleteIds = athletes.map((a) => a.id);
  const { data: logs } = athleteIds.length
    ? await supabase
        .from("health_logs")
        .select("athlete_id, date, hrv, resting_hr, wellbeing")
        .in("athlete_id", athleteIds)
        .gte("date", rangeStart)
        .order("date")
    : { data: [] };

  const logsByAthlete = new Map<string, HealthLog[]>();
  for (const log of logs ?? []) {
    logsByAthlete.set(log.athlete_id, [...(logsByAthlete.get(log.athlete_id) ?? []), log]);
  }

  const selectedAthlete =
    params.athlete && athletes.some((a) => a.id === params.athlete) ? params.athlete : athletes[0]?.id;
  const selected = athletes.find((a) => a.id === selectedAthlete);
  const selectedLogs = selected ? logsByAthlete.get(selected.id) ?? [] : [];
  const { level } = selected
    ? computeHealthStatus(selectedLogs, today)
    : { level: "none" as HealthStatusLevel };

  return (
    <div>
      <div className="kicker">Bereitschaft und Verläufe</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Gesundheit</h2>

      {(!groups || groups.length === 0) ? (
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      ) : (
        <>
          <div className="mt-[22px]">
            <HealthGroupFilter key={selectedGroup} groups={groups} />
          </div>

          {athletes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {athletes.map((a) => {
                const active = a.id === selectedAthlete;
                return (
                  <a
                    key={a.id}
                    href={`/trainer/health?group=${selectedGroup}&athlete=${a.id}`}
                    className="chip"
                    style={{
                      background: active ? "var(--dc-neutral-700)" : "transparent",
                      color: active ? "var(--dc-bg)" : "var(--dc-text)",
                    }}
                  >
                    {a.full_name}
                  </a>
                );
              })}
            </div>
          )}

          {selectedGroup && athletes.length === 0 && (
            <p className="mt-4 text-sm text-muted">Noch keine Athleten in dieser Gruppe.</p>
          )}

          {selected && (
            <>
              <div className="mt-7 flex items-baseline gap-3.5">
                <h3 className="text-[24px]">{selected.full_name}</h3>
                <span className={`tag ${LEVEL_TAG[level]}`}>{HEALTH_STATUS_LABEL[level]}</span>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                Dreißig Tage im Verlauf — mit dem Zeiger über eine Kurve fahren zeigt den Tageswert.
              </p>

              <div className="mt-6 max-w-[720px]">
                {selectedLogs.length > 0 ? (
                  <div className="flex flex-col gap-8">
                    {METRICS.map((m) => {
                      const points = selectedLogs
                        .filter((l) => l[m.key] != null)
                        .map((l) => ({ date: l.date, value: l[m.key] as number }));
                      return points.length > 0 ? (
                        <TrendChart
                          key={m.key}
                          label={m.label}
                          unit={m.unit}
                          data={points}
                          domain={m.domain}
                          height={96}
                          todayDate={today}
                        />
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Noch keine Gesundheitsdaten vorhanden.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
