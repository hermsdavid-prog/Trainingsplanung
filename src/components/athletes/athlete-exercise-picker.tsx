"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ExerciseTypeahead } from "@/components/athletik/athletik-filters";

export function AthleteExercisePicker({
  exercises,
  selectedExercise,
}: {
  exercises: { id: string; name: string }[];
  selectedExercise: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <ExerciseTypeahead
      key={selectedExercise}
      exercises={exercises}
      selectedId={selectedExercise}
      onSelect={(id) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("exercise", id);
        router.push(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
