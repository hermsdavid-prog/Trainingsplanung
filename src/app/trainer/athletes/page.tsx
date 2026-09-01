import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateCompact } from "@/lib/date";
import { computeHealthStatus, HEALTH_STATUS_LABEL, type HealthLog, type HealthStatusLevel } from "@/lib/health-status";
import { estimateOneRepMax } from "@/lib/one-rep-max";
import { TrendChart } from "@/components/health/trend-chart";
import { AthleteGroupTabs } from "@/components/athletes/athlete-group-tabs";
import { AthleteSelect } from "@/components/athletes/athlete-select";
import { AthleteExercisePicker } from "@/components/athletes/athlete-exercise-picker";
import { SendNoteForm } from "@/components/athletes/send-note-form";
import { BadgesList } from "@/components/athletes/badges-list";

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

// Combines the previous separate Statistik (Athletik-Fortschritt) and
// Gesundheit pages into one "Athleten" view: pick a group, pick an athlete
// from it, see everything about them in one place instead of switching
// between two nav items and re-picking the same athlete twice.
export default async function TrainerAthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; athlete?: string; exercise?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const rangeStart = shiftDateISO(today, -30);
  const supabase = await createClient();

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  const selectedGroup =
    params.group && (groups ?? []).some((g) => g.id === params.group) ? params.group : groups?.[0]?.id;

  const { data: groupAthleteRows } = selectedGroup
    ? await supabase.from("group_athletes").select("athlete_id, profiles(full_name)").eq("group_id", selectedGroup)
    : { data: [] };

  const athletes = (groupAthleteRows ?? [])
    .filter((row) => row.profiles?.full_name)
    .map((row) => ({ id: row.athlete_id, full_name: row.profiles!.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const selectedAthlete =
    params.athlete && athletes.some((a) => a.id === params.athlete) ? params.athlete : athletes[0]?.id;
  const selected = athletes.find((a) => a.id === selectedAthlete);

  // — Gesundheit —
  const { data: healthLogs } = selected
    ? await supabase
        .from("health_logs")
        .select("athlete_id, date, hrv, resting_hr, wellbeing")
        .eq("athlete_id", selected.id)
        .gte("date", rangeStart)
        .order("date")
    : { data: [] };
  const typedHealthLogs: HealthLog[] = healthLogs ?? [];
  const { level } = selected ? computeHealthStatus(typedHealthLogs, today) : { level: "none" as HealthStatusLevel };

  // — Athletik-Fortschritt —
  const { data: exerciseRows } = selected
    ? await supabase.from("exercise_results").select("exercise_id, exercises(id, name)").eq("athlete_id", selected.id)
    : { data: [] };
  const exerciseMap = new Map<string, string>();
  for (const row of exerciseRows ?? []) {
    if (row.exercises?.name) exerciseMap.set(row.exercise_id, row.exercises.name);
  }
  const exercises = Array.from(exerciseMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedExercise =
    params.exercise && exerciseMap.has(params.exercise) ? params.exercise : exercises[0]?.id;
  const selectedExerciseName = exercises.find((e) => e.id === selectedExercise)?.name ?? "";

  const { data: rawResults } =
    selected && selectedExercise
      ? await supabase
          .from("exercise_results")
          .select("date, value, reps, unit, set_type")
          .eq("athlete_id", selected.id)
          .eq("exercise_id", selectedExercise)
          .order("date")
      : { data: [] };

  const resultsByDate = new Map<string, { date: string; value: number; reps: number | null; unit: string | null }>();
  for (const r of rawResults ?? []) {
    if (r.set_type === "aufwaermsatz") continue;
    const existing = resultsByDate.get(r.date);
    if (!existing || r.value > existing.value) resultsByDate.set(r.date, r);
  }
  const exerciseResults = Array.from(resultsByDate.values())
    .map((r) => ({ ...r, oneRm: r.reps != null ? estimateOneRepMax(r.value, r.reps) : null }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const best = exerciseResults.length ? Math.max(...exerciseResults.map((r) => r.value)) : null;
  const bestOneRm = exerciseResults.some((r) => r.oneRm != null)
    ? Math.max(...exerciseResults.map((r) => r.oneRm ?? -Infinity))
    : null;
  const resultUnit = exerciseResults.find((r) => r.unit)?.unit ?? "";
  const gain =
    exerciseResults.length >= 2
      ? Math.round((exerciseResults[exerciseResults.length - 1].value - exerciseResults[0].value) * 100) / 100
      : null;

  // — Hinweise vom Trainer —
  const { data: noteRows } = selected
    ? await supabase
        .from("athlete_notes")
        .select("id, message, created_at, read_at, profiles!athlete_notes_trainer_id_fkey(full_name)")
        .eq("athlete_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const notes = (noteRows ?? []).map((n) => ({
    id: n.id,
    message: n.message,
    createdAt: n.created_at,
    read: n.read_at != null,
    trainerName: n.profiles?.full_name ?? "—",
  }));

  // — Erfolge —
  const { data: badgeRows } = selected
    ? await supabase
        .from("athlete_badges")
        .select("badge_key, title, description, icon, earned_at")
        .eq("athlete_id", selected.id)
        .order("earned_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const badges = (badgeRows ?? []).map((b) => ({
    key: b.badge_key,
    title: b.title,
    description: b.description,
    icon: b.icon,
    earnedAt: b.earned_at,
  }));

  return (
    <div>
      <div className="kicker">Gesundheit, Fortschritt und Hinweise</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Athleten</h2>

      {(!groups || groups.length === 0) ? (
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      ) : (
        <>
          <div className="mt-[22px]">
            <AthleteGroupTabs groups={groups} selectedGroup={selectedGroup} />
          </div>

          {athletes.length > 0 && (
            <div className="mt-3">
              <AthleteSelect athletes={athletes} selectedAthlete={selected?.id} />
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

              <div className="mt-7 grid grid-cols-1 gap-12 lg:grid-cols-2">
                <div className="min-w-0">
                  <div className="kicker-muted">Gesundheit</div>
                  <p className="mt-1.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                    Dreißig Tage im Verlauf.
                  </p>
                  <div className="mt-4 max-w-[560px]">
                    {typedHealthLogs.length > 0 ? (
                      <div className="flex flex-col gap-7">
                        {METRICS.map((m) => {
                          const points = typedHealthLogs
                            .filter((l) => l[m.key] != null)
                            .map((l) => ({ date: l.date, value: l[m.key] as number }));
                          return points.length > 0 ? (
                            <TrendChart
                              key={m.key}
                              label={m.label}
                              unit={m.unit}
                              data={points}
                              domain={m.domain}
                              height={90}
                              todayDate={today}
                            />
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Noch keine Gesundheitsdaten vorhanden.</p>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="kicker-muted">Athletik-Fortschritt</div>
                  {exercises.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Für diesen Athleten liegen noch keine Athletik-Ergebnisse vor.</p>
                  ) : (
                    <>
                      <div className="mt-3 max-w-[260px]">
                        <AthleteExercisePicker exercises={exercises} selectedExercise={selectedExercise} />
                      </div>
                      {selectedExercise && exerciseResults.length > 0 && (
                        <>
                          <div className="mt-4 max-w-[560px]">
                            <TrendChart
                              label={selectedExerciseName}
                              unit={resultUnit}
                              data={exerciseResults.map((r) => ({ date: r.date, value: r.value }))}
                              height={110}
                              todayDate={today}
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                            <span>Bestwert: <strong style={{ color: "var(--dc-text)" }}>{best} {resultUnit}</strong></span>
                            {bestOneRm != null && (
                              <span>Bestes geschätztes 1RM: <strong style={{ color: "var(--dc-text)" }}>{bestOneRm} {resultUnit}</strong></span>
                            )}
                            {gain != null && (
                              <span>
                                Seit {formatDateCompact(exerciseResults[0].date)}:{" "}
                                <strong style={{ color: gain >= 0 ? "var(--dc-accent-700)" : "var(--dc-accent-2-700)" }}>
                                  {gain > 0 ? "+" : ""}
                                  {gain} {resultUnit}
                                </strong>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-9">
                <div className="kicker-muted">Erfolge</div>
                <BadgesList badges={badges} />
              </div>

              <div className="mt-9 max-w-[640px]">
                <div className="kicker-muted">Hinweis an {selected.full_name}</div>
                <p className="mt-1.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                  Z. B. wenn die Gesundheitsdaten abweichen — der Athlet sieht das auf seiner Startseite.
                </p>
                <div className="mt-3">
                  <SendNoteForm athleteId={selected.id} />
                </div>
                {notes.length > 0 && (
                  <div className="mt-5 flex flex-col gap-2">
                    {notes.map((n) => (
                      <div key={n.id} className="p-3" style={{ background: "var(--dc-surface)", borderLeft: n.read ? "2px solid var(--dc-divider)" : "2px solid var(--dc-accent)" }}>
                        <p className="text-[14px] leading-[1.5]">{n.message}</p>
                        <p className="mt-1 text-xs text-muted">
                          {n.trainerName} · {new Date(n.createdAt).toLocaleDateString("de-DE")}
                          {n.read ? " · gelesen" : " · ungelesen"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
