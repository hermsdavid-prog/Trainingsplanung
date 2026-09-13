import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateCompact } from "@/lib/date";
import { MesocycleScopeToggle } from "@/components/mesocycles/mesocycle-scope-toggle";
import { MesocycleGroupTabs } from "@/components/mesocycles/mesocycle-group-tabs";
import { MesocycleAthleteSelect } from "@/components/mesocycles/mesocycle-athlete-select";
import { CreateMesocycleDialog } from "@/components/mesocycles/create-mesocycle-dialog";
import { EditMesocycleDialog } from "@/components/mesocycles/edit-mesocycle-dialog";
import { MesocycleTimeline } from "@/components/mesocycles/mesocycle-timeline";
import { MesocycleCarousel } from "@/components/mesocycles/mesocycle-carousel";

type Mesocycle = { id: string; title: string; description: string | null; start_date: string; weeks: number };
type Plan = { id: string; title: string; date: string };

function ListToggle({ hrefBase, view }: { hrefBase: string; view: "list" | "calendar" }) {
  return (
    <div className="flex gap-1">
      <Link
        href={`${hrefBase}&view=list`}
        className="chip"
        style={view === "list" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
      >
        Liste
      </Link>
      <Link
        href={`${hrefBase}&view=calendar`}
        className="chip"
        style={view === "calendar" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
      >
        Kalender
      </Link>
    </div>
  );
}

function MesocycleCard({ m, plans }: { m: Mesocycle; plans: Plan[] }) {
  const endDate = shiftDateISO(m.start_date, m.weeks * 7 - 1);
  return (
    <div className="w-[300px] flex-none p-4" style={{ background: "var(--dc-surface)", scrollSnapAlign: "start" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[17px] leading-[1.25]">{m.title}</div>
          <div className="mt-1 text-xs text-muted">
            {formatDateCompact(m.start_date)} – {formatDateCompact(endDate)} · {m.weeks} {m.weeks === 1 ? "Woche" : "Wochen"}
          </div>
          {m.description && <p className="mt-2 text-[13px] leading-[1.5]">{m.description}</p>}
        </div>
        <EditMesocycleDialog mesocycle={m} />
      </div>

      {plans.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--dc-divider)" }}>
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/trainer/plans/${p.id}/edit`}
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

// Mesozyklen sind eine rein optionale Organisationsebene über den
// Trainingsplänen — ein benannter, beschriebener Block fester Länge (z. B.
// "Kraftaufbau", 6 Wochen), einer Gruppe oder einem einzelnen Athleten
// zugeordnet. Trainer legen sie hier an; die Zuordnung einzelner
// Trainingseinheiten passiert auf der jeweiligen Plan-Bearbeiten-Seite.
export default async function TrainerMesocyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; group?: string; athlete?: string; view?: string }>;
}) {
  const params = await searchParams;
  const scope: "group" | "athlete" = params.scope === "athlete" ? "athlete" : "group";
  const view: "list" | "calendar" = params.view === "calendar" ? "calendar" : "list";
  const supabase = await createClient();

  // groups_select RLS already scopes this to the trainer's own groups, so
  // this is exactly "all groups assigned to the trainer".
  const { data: groupRows } = await supabase.from("groups").select("id, name").order("name");
  const groups = groupRows ?? [];

  if (groups.length === 0) {
    return (
      <div>
        <div className="kicker">Trainingsperiodisierung</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      </div>
    );
  }

  const plansByMesocycle = new Map<string, Plan[]>();
  async function loadPlans(mesocycleIds: string[]) {
    const { data: planRows } = mesocycleIds.length
      ? await supabase
          .from("training_plans")
          .select("id, title, date, mesocycle_id")
          .in("mesocycle_id", mesocycleIds)
          .order("date")
      : { data: [] };
    for (const p of planRows ?? []) {
      if (!p.mesocycle_id) continue;
      const list = plansByMesocycle.get(p.mesocycle_id) ?? [];
      list.push({ id: p.id, title: p.title, date: p.date });
      plansByMesocycle.set(p.mesocycle_id, list);
    }
  }

  if (scope === "athlete") {
    const selectedGroup =
      params.group && groups.some((g) => g.id === params.group) ? params.group : groups[0]?.id;

    const { data: groupAthleteRows } = selectedGroup
      ? await supabase.from("group_athletes").select("athlete_id, profiles(full_name)").eq("group_id", selectedGroup)
      : { data: [] };
    const athletes = (groupAthleteRows ?? [])
      .filter((row) => row.profiles?.full_name)
      .map((row) => ({ id: row.athlete_id, full_name: row.profiles!.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const selectedAthlete =
      params.athlete && athletes.some((a) => a.id === params.athlete) ? params.athlete : athletes[0]?.id;

    const { data: mesocycleRows } = selectedAthlete
      ? await supabase
          .from("training_mesocycles")
          .select("id, title, description, start_date, weeks")
          .eq("athlete_id", selectedAthlete)
          .order("start_date", { ascending: false })
      : { data: [] };
    const mesocycles = mesocycleRows ?? [];
    await loadPlans(mesocycles.map((m) => m.id));

    const hrefBase = `/trainer/mesocycles?scope=athlete&group=${selectedGroup ?? ""}&athlete=${selectedAthlete ?? ""}`;

    return (
      <div>
        <div className="kicker">Trainingsperiodisierung</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>

        <div className="mt-[22px]">
          <MesocycleScopeToggle scope={scope} />
        </div>
        <div className="mt-3.5">
          <MesocycleGroupTabs groups={groups} selectedGroup={selectedGroup} />
        </div>
        <div className="mt-3">
          {athletes.length > 0 ? (
            <MesocycleAthleteSelect athletes={athletes} selectedAthlete={selectedAthlete} />
          ) : (
            <p className="text-sm text-muted">Noch kein Athlet in dieser Gruppe.</p>
          )}
        </div>

        {selectedAthlete && (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[20px]">
                Mesozyklen — {athletes.find((a) => a.id === selectedAthlete)?.full_name ?? "—"}
              </h3>
              <div className="flex items-center gap-2">
                <ListToggle hrefBase={hrefBase} view={view} />
                <CreateMesocycleDialog scopeType="athlete" targetId={selectedAthlete} />
              </div>
            </div>

            {view === "calendar" ? (
              <MesocycleTimeline
                mesocycles={mesocycles.map((m) => ({ ...m, plans: plansByMesocycle.get(m.id) ?? [] }))}
                todayIso={todayISO()}
              />
            ) : mesocycles.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
            ) : (
              <div className="mt-4">
                <MesocycleCarousel>
                  {mesocycles.map((m) => (
                    <MesocycleCard key={m.id} m={m} plans={plansByMesocycle.get(m.id) ?? []} />
                  ))}
                </MesocycleCarousel>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // scope === "group": defaults to every one of the trainer's groups
  // stacked underneath each other, each labeled with its group name — an
  // explicit ?group= filter narrows that down to just one.
  const selectedGroupFilter = params.group && groups.some((g) => g.id === params.group) ? params.group : undefined;
  const targetGroups = selectedGroupFilter ? groups.filter((g) => g.id === selectedGroupFilter) : groups;

  const { data: mesocycleRows } = await supabase
    .from("training_mesocycles")
    .select("id, title, description, start_date, weeks, group_id")
    .in(
      "group_id",
      targetGroups.map((g) => g.id)
    )
    .order("start_date", { ascending: false });
  const mesocyclesByGroup = new Map<string, Mesocycle[]>();
  for (const m of mesocycleRows ?? []) {
    if (!m.group_id) continue;
    const list = mesocyclesByGroup.get(m.group_id) ?? [];
    list.push(m);
    mesocyclesByGroup.set(m.group_id, list);
  }
  await loadPlans((mesocycleRows ?? []).map((m) => m.id));

  const totalCount = mesocycleRows?.length ?? 0;
  const hrefBase = `/trainer/mesocycles?scope=group&group=${selectedGroupFilter ?? ""}`;

  return (
    <div>
      <div className="kicker">Trainingsperiodisierung</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>

      <div className="mt-[22px]">
        <MesocycleScopeToggle scope={scope} />
      </div>
      <div className="mt-3.5">
        <MesocycleGroupTabs groups={groups} selectedGroup={selectedGroupFilter} allowAll />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[20px]">
          Mesozyklen{selectedGroupFilter ? ` — ${groups.find((g) => g.id === selectedGroupFilter)?.name}` : " — alle Gruppen"}
        </h3>
        <div className="flex items-center gap-2">
          <ListToggle hrefBase={hrefBase} view={view} />
          <CreateMesocycleDialog scopeType="group" groups={groups} defaultGroupId={selectedGroupFilter} />
        </div>
      </div>

      {totalCount === 0 ? (
        <p className="mt-3 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-7">
          {targetGroups.map((g) => {
            const mesocycles = mesocyclesByGroup.get(g.id) ?? [];
            if (mesocycles.length === 0) {
              // Skip a silent group in the "all groups" overview so it doesn't
              // clutter the page with empty sections — an explicit single-group
              // filter still shows it, since that's a deliberate "this one" pick.
              return selectedGroupFilter ? (
                <div key={g.id}>
                  <div className="kicker-muted">{g.name}</div>
                  <p className="mt-2 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
                </div>
              ) : null;
            }
            return (
              <div key={g.id}>
                <div className="kicker-muted">{g.name}</div>
                {view === "calendar" ? (
                  <MesocycleTimeline
                    mesocycles={mesocycles.map((m) => ({ ...m, plans: plansByMesocycle.get(m.id) ?? [] }))}
                    todayIso={todayISO()}
                  />
                ) : (
                  <div className="mt-3">
                    <MesocycleCarousel>
                      {mesocycles.map((m) => (
                        <MesocycleCard key={m.id} m={m} plans={plansByMesocycle.get(m.id) ?? []} />
                      ))}
                    </MesocycleCarousel>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
