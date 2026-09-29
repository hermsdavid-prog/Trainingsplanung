import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutSession } from "@/components/athlete/workout-session";
import { loadWorkoutSession } from "@/lib/workout-session-data";

// The live, tap-to-log training session for a single day's assigned plan —
// the mobile-first counterpart to the read-only PlanFeedbackTable. Athletik
// plans get the full set-by-set logging flow (numeric keypad, rest timer,
// exercise switching); Sportartspezifisch ("Karate" in the design source)
// plans get a lighter round-tracking view. Both end with the same
// Belastungsempfinden (RPE) step.
export default async function AthleteWorkoutSessionPage({
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
    <WorkoutSession
      // Forces a fresh mount per plan — without this, navigating from one
      // plan's session view to another's (e.g. a freshly copied training)
      // can reuse the same component instance across the route change,
      // leaving stale client state like editMode ("Training abgeschlossen")
      // from the PREVIOUS plan visible on a training that was never done.
      key={session.planId}
      {...session}
      backHref={`/athlete/plans/${session.planId}`}
      doneHref="/athlete"
    />
  );
}
