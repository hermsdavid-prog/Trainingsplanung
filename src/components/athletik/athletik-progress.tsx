import { createClient } from "@/lib/supabase/server";
import { AthletikFilters } from "@/components/athletik/athletik-filters";
import { ExerciseProgressChart } from "@/components/athletik/exercise-progress-chart";
import { formatDateShort } from "@/lib/date";
import { estimateOneRepMax } from "@/lib/one-rep-max";
import { VbtProfile } from "@/components/athletik/vbt-profile";

// One user's own Athletik progress per exercise (best work set per day,
// estimated 1RM, history table) — the athlete's Athletik tab, and the
// "Fortschritt" part of a coach's "Mein Training".
export async function AthletikProgress({
  userId,
  exerciseParam,
  mvtParam,
  variant = "page",
}: {
  userId: string;
  exerciseParam?: string;
  // VBT profile: minimal velocity threshold from the URL (?mvt=).
  mvtParam?: string;
  // "page": the exercise name is the page's h2 (athlete Athletik tab);
  // "section": a sub-section under another page heading.
  variant?: "page" | "section";
}) {
  const supabase = await createClient();

  const { data: exerciseRows } = await supabase
    .from("exercise_results")
    .select("exercise_id, exercises(id, name)")
    .eq("athlete_id", userId);

  const exerciseMap = new Map<string, string>();
  for (const row of exerciseRows ?? []) {
    if (row.exercises?.name) exerciseMap.set(row.exercise_id, row.exercises.name);
  }
  const exercises = Array.from(exerciseMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedExercise = exerciseParam && exerciseMap.has(exerciseParam) ? exerciseParam : exercises[0]?.id;
  const selectedName = exercises.find((e) => e.id === selectedExercise)?.name ?? "";

  const { data: rawResults } = selectedExercise
    ? await supabase
        .from("exercise_results")
        .select("date, value, reps, unit, set_type")
        .eq("athlete_id", userId)
        .eq("exercise_id", selectedExercise)
        .order("date")
    : { data: [] };

  const resultsByDate = new Map<string, { date: string; value: number; reps: number | null; unit: string | null }>();
  for (const r of rawResults ?? []) {
    if (r.set_type === "aufwaermsatz") continue;
    const existing = resultsByDate.get(r.date);
    if (!existing || r.value > existing.value) resultsByDate.set(r.date, r);
  }
  const results = Array.from(resultsByDate.values())
    .map((r) => ({ ...r, oneRm: r.reps != null ? estimateOneRepMax(r.value, r.reps) : null }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const best = results.length ? Math.max(...results.map((r) => r.value)) : null;
  const bestOneRm = results.some((r) => r.oneRm != null) ? Math.max(...results.map((r) => r.oneRm ?? -Infinity)) : null;
  const resultUnit = results.find((r) => r.unit)?.unit ?? "";

  return (
    <div>
      {variant === "page" ? (
        <>
          <div className="kicker">Athletik</div>
          <h2 className="mt-2.5 text-[27px] leading-[1.08]">{selectedName || "Athletik-Fortschritt"}</h2>
        </>
      ) : (
        <div className="kicker-muted">Athletik-Fortschritt</div>
      )}

      {exercises.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Noch keine Athletik-Ergebnisse eingetragen. Trage in einem Training der Kategorie „Athletik“ Ergebnisse zu
          Übungen aus der Bibliothek ein.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <AthletikFilters exercises={exercises} />
          </div>

          {best != null && (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[28px] leading-none font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                  {best}
                  {resultUnit ? ` ${resultUnit}` : ""}
                </span>
                <span className="text-sm" style={{ color: "var(--dc-muted)" }}>
                  bester Wert
                </span>
              </div>
              {bestOneRm != null && (
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[22px] leading-none font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
                    {bestOneRm} {resultUnit}
                  </span>
                  <span className="text-sm" style={{ color: "var(--dc-muted)" }}>
                    geschätztes 1RM
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedExercise && results.length > 0 && (
            <div className="mt-4">
              <ExerciseProgressChart data={results} />

              <div className="mt-4 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Ergebnis</th>
                      <th>Wdh.</th>
                      <th>Geschätztes 1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .slice()
                      .reverse()
                      .map((r) => (
                        <tr key={r.date}>
                          <td>{formatDateShort(r.date)}</td>
                          <td>
                            {r.value}
                            {r.unit ? ` ${r.unit}` : ""}
                          </td>
                          <td style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>{r.reps ?? "—"}</td>
                          <td>{r.oneRm != null ? `${r.oneRm} ${r.unit ?? ""}` : "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {selectedExercise && (
            <VbtProfile athleteId={userId} exerciseId={selectedExercise} exerciseName={selectedName} mvtParam={mvtParam} />
          )}
        </>
      )}
    </div>
  );
}
