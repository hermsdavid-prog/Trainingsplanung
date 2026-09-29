import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutSession } from "@/components/athlete/workout-session";
import { loadWorkoutSession } from "@/lib/workout-session-data";

// "Selbst trainieren": a coach works through a training exactly the way an
// athlete does — same live session, same set/weight/RIR, cardio and RPE
// entry — logged under the coach's own id. Group statistics, the weekly
// report and the export only ever look at a group's athletes, so a coach's
// own entries never mix into them; they show up under "Mein Training".
export default async function TrainerWorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const session = await loadWorkoutSession(supabase, id, user.id);
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-[560px]">
      <WorkoutSession
        key={session.planId}
        {...session}
        backHref={`/trainer/plans/${session.planId}/workout`}
        doneHref="/trainer/training"
      />
    </div>
  );
}
