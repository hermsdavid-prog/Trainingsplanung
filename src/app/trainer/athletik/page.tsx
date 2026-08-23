import { createClient } from "@/lib/supabase/server";
import { AthletikFilters } from "@/components/athletik/athletik-filters";
import { TrendChart } from "@/components/health/trend-chart";
import { formatDateCompact, todayISO } from "@/lib/date";

export default async function TrainerAthletikPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; athlete?: string; exercise?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  const { data: allGroupAthleteRows } = await supabase
    .from("group_athletes")
    .select("group_id, athlete_id, profiles(full_name)");

  const athleteCountByGroup = new Map<string, number>();
  for (const row of allGroupAthleteRows ?? []) {
    athleteCountByGroup.set(row.group_id, (athleteCountByGroup.get(row.group_id) ?? 0) + 1);
  }
  const groupOpts = (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    athleteCount: athleteCountByGroup.get(g.id) ?? 0,
  }));

  const selectedGroup =
    params.group && (groups ?? []).some((g) => g.id === params.group) ? params.group : groups?.[0]?.id;

  const groupAthleteRows = (allGroupAthleteRows ?? []).filter((r) => r.group_id === selectedGroup);
  const athletes = groupAthleteRows
    .filter((row) => row.profiles?.full_name)
    .map((row) => ({ id: row.athlete_id, full_name: row.profiles!.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const selectedAthlete = params.athlete && athletes.some((a) => a.id === params.athlete) ? params.athlete : athletes[0]?.id;
  const selectedAthleteName = athletes.find((a) => a.id === selectedAthlete)?.full_name ?? "";

  const { data: exerciseRows } = selectedAthlete
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, exercises(id, name)")
        .eq("athlete_id", selectedAthlete)
    : { data: [] };

  const exerciseMap = new Map<string, string>();
  for (const row of exerciseRows ?? []) {
    if (row.exercises?.name) exerciseMap.set(row.exercise_id, row.exercises.name);
  }
  const exercises = Array.from(exerciseMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedExercise = params.exercise && exerciseMap.has(params.exercise) ? params.exercise : exercises[0]?.id;
  const selectedExerciseName = exercises.find((e) => e.id === selectedExercise)?.name ?? "";

  const { data: rawResults } = selectedAthlete && selectedExercise
    ? await supabase
        .from("exercise_results")
        .select("date, value, unit, set_type")
        .eq("athlete_id", selectedAthlete)
        .eq("exercise_id", selectedExercise)
        .order("date")
    : { data: [] };

  const resultsByDate = new Map<string, { date: string; value: number; unit: string | null }>();
  for (const r of rawResults ?? []) {
    if (r.set_type === "aufwaermsatz") continue;
    const existing = resultsByDate.get(r.date);
    if (!existing || r.value > existing.value) resultsByDate.set(r.date, r);
  }
  const results = Array.from(resultsByDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  const best = results.length ? Math.max(...results.map((r) => r.value)) : null;
  const unit = results.find((r) => r.unit)?.unit ?? "";
  const gain =
    results.length >= 2 ? Math.round((results[results.length - 1].value - results[0].value) * 100) / 100 : null;

  // "Gruppenschnitt heute" — average of every group member's most recent
  // recorded working-set value for the selected exercise.
  let groupAvg: number | null = null;
  if (selectedExercise && athletes.length > 0) {
    const { data: groupResultRows } = await supabase
      .from("exercise_results")
      .select("athlete_id, date, value, set_type")
      .eq("exercise_id", selectedExercise)
      .in(
        "athlete_id",
        athletes.map((a) => a.id)
      )
      .order("date");
    const latestByAthlete = new Map<string, number>();
    for (const r of groupResultRows ?? []) {
      if (r.set_type === "aufwaermsatz") continue;
      latestByAthlete.set(r.athlete_id, r.value);
    }
    if (latestByAthlete.size > 0) {
      const vals = Array.from(latestByAthlete.values());
      groupAvg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
  }

  const today = todayISO();

  return (
    <div>
      <div className="kicker">Leistungsentwicklung</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Statistik</h2>

      {(groups ?? []).length === 0 ? (
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      ) : (
        <>
          <div className="mt-6">
            <AthletikFilters key={`${selectedGroup}-${selectedAthlete}`} groups={groupOpts} athletes={athletes} exercises={exercises} />
          </div>

          {athletes.length === 0 && <p className="mt-4 text-sm text-muted">Noch keine Athleten in dieser Gruppe.</p>}

          {selectedAthlete && exercises.length === 0 && (
            <p className="mt-4 text-sm text-muted">Für diesen Athleten liegen noch keine Athletik-Ergebnisse vor.</p>
          )}

          {selectedAthlete && selectedExercise && results.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-11 lg:grid-cols-[1fr_300px] lg:items-start max-w-[1000px]">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-[22px]">{selectedExerciseName}</h3>
                    <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                      {selectedAthleteName} · {unit}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5">
                  <TrendChart
                    data={results.map((r) => ({ date: r.date, value: r.value }))}
                    height={150}
                    todayDate={today}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Messung</th>
                        <th>Wert</th>
                        <th>Veränderung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => {
                        const prev = i > 0 ? results[i - 1].value : null;
                        const delta = prev !== null ? Math.round((r.value - prev) * 100) / 100 : null;
                        return (
                          <tr key={r.date}>
                            <td style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                              {formatDateCompact(r.date)}
                            </td>
                            <td className="text-[15px]">
                              {r.value}
                              {r.unit ? ` ${r.unit}` : ""}
                            </td>
                            <td>
                              <span
                                className="text-sm"
                                style={{
                                  color:
                                    delta === null
                                      ? "color-mix(in srgb, var(--dc-text) 55%, transparent)"
                                      : delta >= 0
                                        ? "var(--dc-accent-700)"
                                        : "var(--dc-accent-2-700)",
                                }}
                              >
                                {delta === null ? "—" : delta === 0 ? "±0" : `${delta > 0 ? "+" : ""}${delta}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="kicker-muted">Auf einen Blick</div>
                <div className="mt-3">
                  <div className="py-2.5" style={{ borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 10%, transparent)" }}>
                    <div className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                      Bestwert
                    </div>
                    <div className="mt-1 text-[22px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                      {best} {unit}
                    </div>
                  </div>
                  <div className="py-2.5" style={{ borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 10%, transparent)" }}>
                    <div className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                      Seit {formatDateCompact(results[0].date)}
                    </div>
                    {gain != null ? (
                      <div
                        className="mt-1 text-[18px]"
                        style={{ color: gain >= 0 ? "var(--dc-accent-700)" : "var(--dc-accent-2-700)" }}
                      >
                        {gain > 0 ? "+" : ""}
                        {gain} {unit}
                      </div>
                    ) : (
                      <div className="mt-1 text-[18px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                        —
                      </div>
                    )}
                    <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                      Start {results[0].value} {unit}
                    </div>
                  </div>
                  <div className="py-2.5">
                    <div className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                      Gruppenschnitt heute
                    </div>
                    <div className="mt-1 text-[18px]">{groupAvg != null ? `${groupAvg} ${unit}` : "—"}</div>
                  </div>
                </div>
                <div className="mt-5 text-[13px] leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                  Werte kommen aus dem schwersten Arbeitssatz des jeweiligen Tages. Neue Übungen erscheinen hier automatisch, sobald ein Ergebnis eingetragen wird.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
