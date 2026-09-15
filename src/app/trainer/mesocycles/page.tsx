import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateCompact } from "@/lib/date";
import { MesocycleFilters } from "@/components/mesocycles/mesocycle-filters";
import { CreateMesocycleDialog } from "@/components/mesocycles/create-mesocycle-dialog";
import { EditMesocycleDialog } from "@/components/mesocycles/edit-mesocycle-dialog";
import { MesocycleTimeline } from "@/components/mesocycles/mesocycle-timeline";
import { MesocycleCarousel } from "@/components/mesocycles/mesocycle-carousel";
import { MesocycleViewToggle } from "@/components/mesocycles/view-toggle";

type Mesocycle = { id: string; title: string; description: string | null; start_date: string; weeks: number };
type Plan = { id: string; title: string; date: string };

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

function MesocycleSection({
  label,
  mesocycles,
  plansByMesocycle,
  view,
  emptyState,
}: {
  label: string;
  mesocycles: Mesocycle[];
  plansByMesocycle: Map<string, Plan[]>;
  view: "list" | "calendar";
  emptyState: boolean;
}) {
  if (mesocycles.length === 0 && !emptyState) return null;
  return (
    <div>
      <div className="kicker-muted">{label}</div>
      {mesocycles.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
      ) : view === "calendar" ? (
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
}

// Mesozyklen sind eine rein optionale Organisationsebene über den
// Trainingsplänen — ein benannter, beschriebener Block fester Länge (z. B.
// "Kraftaufbau", 6 Wochen), einer Gruppe oder einem einzelnen Athleten
// zugeordnet. Trainer legen sie hier an; die Zuordnung einzelner
// Trainingseinheiten passiert auf der jeweiligen Plan-Bearbeiten-Seite.
//
// Shows every Mesozyklus the trainer has access to at once — every
// group's and every athlete's personal one — rather than requiring a
// scope pick first; the group/athlete filters below just narrow that
// down. Kalender is the default landing view (view=list opts out).
export default async function TrainerMesocyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; athlete?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view: "list" | "calendar" = params.view === "list" ? "list" : "calendar";
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

  const { data: groupAthleteRows } = await supabase
    .from("group_athletes")
    .select("athlete_id, profiles(full_name)")
    .in(
      "group_id",
      groups.map((g) => g.id)
    );
  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries())
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const selectedGroupFilter = params.group && groups.some((g) => g.id === params.group) ? params.group : undefined;
  const selectedAthleteFilter =
    params.athlete && athletes.some((a) => a.id === params.athlete) ? params.athlete : undefined;

  // Picking just one filter narrows the WHOLE page to that axis, not only
  // its own section — e.g. filtering to one group hides every athlete's
  // unrelated personal Mesozyklus instead of leaving them all showing
  // underneath. Setting both filters together keeps both of the picked
  // sections (that's a deliberate "this group AND this athlete" ask).
  const showGroupSections = !(selectedAthleteFilter && !selectedGroupFilter);
  const showAthleteSections = !(selectedGroupFilter && !selectedAthleteFilter);

  const targetGroups = showGroupSections ? (selectedGroupFilter ? groups.filter((g) => g.id === selectedGroupFilter) : groups) : [];
  const targetAthletes = showAthleteSections
    ? selectedAthleteFilter
      ? athletes.filter((a) => a.id === selectedAthleteFilter)
      : athletes
    : [];

  const [{ data: groupMesocycleRows }, { data: athleteMesocycleRows }] = await Promise.all([
    targetGroups.length
      ? supabase
          .from("training_mesocycles")
          .select("id, title, description, start_date, weeks, group_id")
          .in(
            "group_id",
            targetGroups.map((g) => g.id)
          )
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    targetAthletes.length
      ? supabase
          .from("training_mesocycles")
          .select("id, title, description, start_date, weeks, athlete_id")
          .in(
            "athlete_id",
            targetAthletes.map((a) => a.id)
          )
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const mesocyclesByGroup = new Map<string, Mesocycle[]>();
  for (const m of groupMesocycleRows ?? []) {
    if (!m.group_id) continue;
    const list = mesocyclesByGroup.get(m.group_id) ?? [];
    list.push(m);
    mesocyclesByGroup.set(m.group_id, list);
  }
  const mesocyclesByAthlete = new Map<string, Mesocycle[]>();
  for (const m of athleteMesocycleRows ?? []) {
    if (!m.athlete_id) continue;
    const list = mesocyclesByAthlete.get(m.athlete_id) ?? [];
    list.push(m);
    mesocyclesByAthlete.set(m.athlete_id, list);
  }

  const allIds = [...(groupMesocycleRows ?? []).map((m) => m.id), ...(athleteMesocycleRows ?? []).map((m) => m.id)];
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

  const totalCount = allIds.length;
  const hrefBase = `/trainer/mesocycles?group=${selectedGroupFilter ?? ""}&athlete=${selectedAthleteFilter ?? ""}`;

  return (
    <div>
      <div className="kicker">Trainingsperiodisierung</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>

      <div className="mt-5">
        <MesocycleFilters groups={groups} athletes={athletes} selectedGroup={selectedGroupFilter} selectedAthlete={selectedAthleteFilter} />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[20px]">Mesozyklen</h3>
        <div className="flex items-center gap-2">
          <MesocycleViewToggle hrefBase={hrefBase} view={view} />
          <CreateMesocycleDialog
            groups={groups}
            athletes={athletes}
            defaultGroupId={selectedGroupFilter}
            defaultAthleteId={selectedAthleteFilter}
          />
        </div>
      </div>

      {totalCount === 0 ? (
        <p className="mt-3 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-7">
          {targetGroups.map((g) => (
            <MesocycleSection
              key={`group-${g.id}`}
              label={g.name}
              mesocycles={mesocyclesByGroup.get(g.id) ?? []}
              plansByMesocycle={plansByMesocycle}
              view={view}
              emptyState={!!selectedGroupFilter}
            />
          ))}
          {targetAthletes.map((a) => (
            <MesocycleSection
              key={`athlete-${a.id}`}
              label={`Persönlich — ${a.full_name}`}
              mesocycles={mesocyclesByAthlete.get(a.id) ?? []}
              plansByMesocycle={plansByMesocycle}
              view={view}
              emptyState={!!selectedAthleteFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
