// Key for an athlete's private per-exercise note (athlete_exercise_notes):
// the library exercise when there is one, so the note follows the exercise
// into every later training; otherwise the name (cardio items).
export function exerciseNoteKey(exerciseId: string | null | undefined, name: string): string {
  return exerciseId ? exerciseId : `name:${name.trim().toLowerCase()}`.slice(0, 200);
}
