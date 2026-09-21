import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateCompact } from "@/lib/date";
import { MesocycleCarousel } from "@/components/mesocycles/mesocycle-carousel";
import { MesocycleTimeline } from "@/components/mesocycles/mesocycle-timeline";
import { MesocycleViewToggle } from "@/components/mesocycles/view-toggle";
import { GoalToggleList, type MesocycleGoal } from "@/components/mesocycles/goal-toggle-list";

type Mesocycle = { id: string; title: string; description: string | null; start_date: string; weeks: number };
type Plan = { id: string; title: string; date: string };

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function athletePlanHref(planId: string) {
  return `/athlete/plans/${planId}`;
}

function MesocycleProgressCard({
  m,
  plans,
  goals,
  todayIso,
}: {
  m: Mesocycle;
  plans: Plan[];
  goals: MesocycleGoal[];
  todayIso: string;
}) {
  const totalDays = m.weeks * 7;
  const endDate = shiftDateISO(m.start_date, totalDays - 1);
  const elapsed = daysBetween(m.start_date, todayIso);
  const progressPct = Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
  const statusLabel =
    elapsed < 0
      ? `Startet am ${formatDateCompact(m.start_date)}`
      : elapsed >= totalDays
        ? "Abgeschlossen"
        : `Woche ${Math.floor(elapsed / 7) + 1} von ${m.weeks}`;

  return (
    <div className="w-[300px] flex-none p-4" style={{ background: "var(--dc-surface)", scrollSnapAlign: "start" }}>
      <div className="text-[17px] leading-[1.25]">{m.title}</div>
      <div className="mt-1 text-xs text-muted">
        {formatDateCompact(m.start_date)} – {formatDateCompact(endDate)} · {m.weeks} {m.weeks === 1 ? "Woche" : "Wochen"}
      </div>
      {m.description && <p className="mt-2 text-[13px] leading-[1.5]">{m.description}</p>}

      <div className="mt-3 flex items-baseline justify-between text-[13px]">
        <span>{statusLabel}</span>
      </div>
      <div className="mt-1.5 h-[3px]" style={{ background: "color-mix(in srgb, var(--dc-text) 12%, transparent)" }}>
        <div className="h-[3px]" style={{ background: "var(--dc-accent)", width: `${progressPct}%` }} />
      </div>

      <GoalToggleList goals={goals} />

      {plans.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--dc-divider)" }}>
          {plans.map((p) => (
            <Link
              key={p.id}
              href={athletePlanHref(p.id)}
              className="flex items-center justify-between gap-2 text-[13px] no-underline"
              style={{ color: "inherit" }}
            >
              <span className="truncate">{p.title}</span>
              <span className="flex-none text-muted">{formatDateCompact(p.date)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MesocycleSection({
  label,
  mesocycles,
  plansByMesocycle,
  goalsByMesocycle,
  view,
  todayIso,
}: {
  label: string;
  mesocycles: Mesocycle[];
  plansByMesocycle: Map<string, Plan[]>;
  goalsByMesocycle: Map<string, MesocycleGoal[]>;
  view: "list" | "calendar";
  todayIso: string;
}) {
  if (mesocycles.length === 0) return null;
  return (
    <div>
      <div className="kicker-muted">{label}</div>
      {view === "calendar" ? (
        <MesocycleTimeline
          mesocycles={mesocycles.map((m) => ({
            ...m,
            plans: plansByMesocycle.get(m.id) ?? [],
            goals: goalsByMesocycle.get(m.id) ?? [],
          }))}
          todayIso={todayIso}
          planLinkRole="athlete"
        />
      ) : (
        <div className="mt-3">
          <MesocycleCarousel>
            {mesocycles.map((m) => (
              <MesocycleProgressCard
                key={m.id}
                m={m}
                plans={plansByMesocycle.get(m.id) ?? []}
                goals={goalsByMesocycle.get(m.id) ?? []}
                todayIso={todayIso}
              />
            ))}
          </MesocycleCarousel>
        </div>
      )}
    </div>
  );
}

// Read-only counterpart to /trainer/mesocycles — an athlete can't create,
// edit or delete a Mesozyklus, just see where they stand in the ones their
// trainer assigned (their groups' cycles, plus any personal one). Kalender
// is the default view, same as the trainer's page; clicking a Mesozyklus
// bar there opens the same detail dialog (title, dates, progress,
// assigned trainings) MesocycleTimeline already provides.
export default async function AthleteMesocyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view: "list" | "calendar" = params.view === "list" ? "list" : "calendar";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: groupRows } = await supabase.from("group_athletes").select("groups(id, name)").eq("athlete_id", user.id);
  const groups = (groupRows ?? [])
    .map((row) => row.groups)
    .filter((g): g is { id: string; name: string } => !!g);

  const [{ data: groupMesocycleRows }, { data: ownMesocycleRows }] = await Promise.all([
    groups.length
      ? supabase
          .from("training_mesocycles")
          .select("id, title, description, start_date, weeks, group_id")
          .in(
            "group_id",
            groups.map((g) => g.id)
          )
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("training_mesocycles")
      .select("id, title, description, start_date, weeks")
      .eq("athlete_id", user.id)
      .order("start_date", { ascending: false }),
  ]);

  const mesocyclesByGroup = new Map<string, Mesocycle[]>();
  for (const m of groupMesocycleRows ?? []) {
    if (!m.group_id) continue;
    const list = mesocyclesByGroup.get(m.group_id) ?? [];
    list.push(m);
    mesocyclesByGroup.set(m.group_id, list);
  }
  const ownMesocycles = ownMesocycleRows ?? [];

  const allIds = [...(groupMesocycleRows ?? []).map((m) => m.id), ...ownMesocycles.map((m) => m.id)];
  const { data: planRows } = allIds.length
    ? await supabase.from("training_plans").select("id, title, date, mesocycle_id").in("mesocycle_id", allIds).order("date")
    : { data: [] };
  const plansByMesocycle = new Map<string, Plan[]>();
  for (const p of planRows ?? []) {
    if (!p.mesocycle_id) continue;
    const list = plansByMesocycle.get(p.mesocycle_id) ?? [];
    list.push({ id: p.id, title: p.title, date: p.date });
    plansByMesocycle.set(p.mesocycle_id, list);
  }

  const { data: goalRows } = allIds.length
    ? await supabase
        .from("mesocycle_goals")
        .select("id, mesocycle_id, text, achieved_at")
        .eq("athlete_id", user.id)
        .in("mesocycle_id", allIds)
        .order("position")
    : { data: [] };
  const goalsByMesocycle = new Map<string, MesocycleGoal[]>();
  for (const g of goalRows ?? []) {
    const list = goalsByMesocycle.get(g.mesocycle_id) ?? [];
    list.push({ id: g.id, text: g.text, achievedAt: g.achieved_at });
    goalsByMesocycle.set(g.mesocycle_id, list);
  }

  const todayIso = todayISO();
  const hasAny = ownMesocycles.length > 0 || [...mesocyclesByGroup.values()].some((list) => list.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="kicker">Trainingsperiodisierung</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>
          <p className="mt-2 text-sm text-muted">Dein Fortschritt in den Trainingsblöcken deiner Trainer.</p>
        </div>
        {hasAny && <MesocycleViewToggle hrefBase="/athlete/mesocycles" view={view} />}
      </div>

      {!hasAny ? (
        <p className="mt-5 text-sm text-muted">Noch kein Mesozyklus zugeordnet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          <MesocycleSection
            label="Persönlich"
            mesocycles={ownMesocycles}
            plansByMesocycle={plansByMesocycle}
            goalsByMesocycle={goalsByMesocycle}
            view={view}
            todayIso={todayIso}
          />
          {groups.map((g) => (
            <MesocycleSection
              key={g.id}
              label={g.name}
              mesocycles={mesocyclesByGroup.get(g.id) ?? []}
              plansByMesocycle={plansByMesocycle}
              goalsByMesocycle={goalsByMesocycle}
              view={view}
              todayIso={todayIso}
            />
          ))}
        </div>
      )}
    </div>
  );
}
