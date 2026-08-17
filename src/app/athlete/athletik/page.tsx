import { createClient } from "@/lib/supabase/server";
import { AthletikFilters } from "@/components/athletik/athletik-filters";
import { ExerciseProgressChart } from "@/components/athletik/exercise-progress-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AthleteAthletikPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exerciseRows } = user
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, exercises(id, name)")
        .eq("athlete_id", user.id)
    : { data: [] };

  const exerciseMap = new Map<string, string>();
  for (const row of exerciseRows ?? []) {
    if (row.exercises?.name) exerciseMap.set(row.exercise_id, row.exercises.name);
  }
  const exercises = Array.from(exerciseMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedExercise = params.exercise && exerciseMap.has(params.exercise) ? params.exercise : exercises[0]?.id;

  const { data: rawResults } = user && selectedExercise
    ? await supabase
        .from("exercise_results")
        .select("date, value, unit, set_type")
        .eq("athlete_id", user.id)
        .eq("exercise_id", selectedExercise)
        .order("date")
    : { data: [] };

  // Multiple sets can exist per day now — collapse to the heaviest Arbeitssatz
  // per day so the curve and table show one clean point per session, without
  // warm-up sets skewing the trend.
  const resultsByDate = new Map<string, { date: string; value: number; unit: string | null }>();
  for (const r of rawResults ?? []) {
    if (r.set_type === "aufwaermsatz") continue;
    const existing = resultsByDate.get(r.date);
    if (!existing || r.value > existing.value) resultsByDate.set(r.date, r);
  }
  const results = Array.from(resultsByDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Athletik-Fortschritt</h1>
        <p className="text-sm text-muted-foreground">
          Deine Entwicklung in einzelnen Athletik-Übungen über die Zeit.
        </p>
      </div>

      {exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Noch keine Athletik-Ergebnisse eingetragen. Trage in einem Training der Kategorie
          &bdquo;Athletik&rdquo; Ergebnisse zu Übungen aus der Bibliothek ein.
        </p>
      )}

      {exercises.length > 0 && <AthletikFilters exercises={exercises} />}

      {selectedExercise && (results?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-4">
          <ExerciseProgressChart data={results ?? []} />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Ergebnis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(results ?? [])
                .slice()
                .reverse()
                .map((r) => (
                  <TableRow key={r.date}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      {r.value}
                      {r.unit ? ` ${r.unit}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
