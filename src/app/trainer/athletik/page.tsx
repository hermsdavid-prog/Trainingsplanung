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

export default async function TrainerAthletikPage({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string; exercise?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: groupAthleteRows } = await supabase
    .from("group_athletes")
    .select("athlete_id, profiles(full_name)");

  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  const selectedAthlete = params.athlete && athleteMap.has(params.athlete) ? params.athlete : athletes[0]?.id;

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

  const { data: rawResults } = selectedAthlete && selectedExercise
    ? await supabase
        .from("exercise_results")
        .select("date, value, unit")
        .eq("athlete_id", selectedAthlete)
        .eq("exercise_id", selectedExercise)
        .order("date")
    : { data: [] };

  // Multiple sets can exist per day now — collapse to the heaviest set per
  // day so the curve and table show one clean point per session.
  const resultsByDate = new Map<string, { date: string; value: number; unit: string | null }>();
  for (const r of rawResults ?? []) {
    const existing = resultsByDate.get(r.date);
    if (!existing || r.value > existing.value) resultsByDate.set(r.date, r);
  }
  const results = Array.from(resultsByDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Athletik-Fortschritt</h1>
        <p className="text-sm text-muted-foreground">
          Entwicklung deiner Athleten in einzelnen Athletik-Übungen über die Zeit.
        </p>
      </div>

      {athletes.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Athleten in deinen Gruppen.</p>
      )}

      {athletes.length > 0 && (
        <AthletikFilters key={selectedAthlete} athletes={athletes} exercises={exercises} />
      )}

      {selectedAthlete && exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Für diesen Athleten liegen noch keine Athletik-Ergebnisse vor.
        </p>
      )}

      {selectedAthlete && selectedExercise && (results?.length ?? 0) > 0 && (
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
