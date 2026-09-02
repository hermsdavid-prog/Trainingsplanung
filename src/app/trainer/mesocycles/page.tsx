import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateCompact } from "@/lib/date";
import { MesocycleScopeToggle } from "@/components/mesocycles/mesocycle-scope-toggle";
import { MesocycleGroupTabs } from "@/components/mesocycles/mesocycle-group-tabs";
import { MesocycleAthleteSelect } from "@/components/mesocycles/mesocycle-athlete-select";
import { CreateMesocycleDialog } from "@/components/mesocycles/create-mesocycle-dialog";
import { EditMesocycleDialog } from "@/components/mesocycles/edit-mesocycle-dialog";
import { MesocycleTimeline } from "@/components/mesocycles/mesocycle-timeline";

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

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  const selectedGroup =
    params.group && (groups ?? []).some((g) => g.id === params.group) ? params.group : groups?.[0]?.id;

  const { data: groupAthleteRows } = selectedGroup
    ? await supabase.from("group_athletes").select("athlete_id, profiles(full_name)").eq("group_id", selectedGroup)
    : { data: [] };
  const athletes = (groupAthleteRows ?? [])
    .filter((row) => row.profiles?.full_name)
    .map((row) => ({ id: row.athlete_id, full_name: row.profiles!.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const selectedAthlete =
    scope === "athlete" && params.athlete && athletes.some((a) => a.id === params.athlete)
      ? params.athlete
      : scope === "athlete"
        ? athletes[0]?.id
        : undefined;

  const targetId = scope === "group" ? selectedGroup : selectedAthlete;
  const targetLabel =
    scope === "group" ? groups?.find((g) => g.id === selectedGroup)?.name : athletes.find((a) => a.id === selectedAthlete)?.full_name;

  const { data: mesocycleRows } = targetId
    ? await supabase
        .from("training_mesocycles")
        .select("id, title, description, start_date, weeks")
        .eq(scope === "group" ? "group_id" : "athlete_id", targetId)
        .order("start_date", { ascending: false })
    : { data: [] };
  const mesocycles = mesocycleRows ?? [];

  const mesocycleIds = mesocycles.map((m) => m.id);
  const { data: planRows } = mesocycleIds.length
    ? await supabase
        .from("training_plans")
        .select("id, title, date, mesocycle_id")
        .in("mesocycle_id", mesocycleIds)
        .order("date")
    : { data: [] };
  const plansByMesocycle = new Map<string, { id: string; title: string; date: string }[]>();
  for (const p of planRows ?? []) {
    if (!p.mesocycle_id) continue;
    const list = plansByMesocycle.get(p.mesocycle_id) ?? [];
    list.push({ id: p.id, title: p.title, date: p.date });
    plansByMesocycle.set(p.mesocycle_id, list);
  }

  return (
    <div>
      <div className="kicker">Trainingsperiodisierung</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mesozyklen</h2>

      {(!groups || groups.length === 0) ? (
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      ) : (
        <>
          <div className="mt-[22px]">
            <MesocycleScopeToggle scope={scope} />
          </div>

          <div className="mt-3.5">
            <MesocycleGroupTabs groups={groups} selectedGroup={selectedGroup} />
          </div>

          {scope === "athlete" && (
            <div className="mt-3">
              {athletes.length > 0 ? (
                <MesocycleAthleteSelect athletes={athletes} selectedAthlete={selectedAthlete} />
              ) : (
                <p className="text-sm text-muted">Noch kein Athlet in dieser Gruppe.</p>
              )}
            </div>
          )}

          {targetId && (
            <>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[20px]">Mesozyklen — {targetLabel ?? "—"}</h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <Link
                      href={`/trainer/mesocycles?scope=${scope}&group=${selectedGroup ?? ""}${scope === "athlete" ? `&athlete=${selectedAthlete ?? ""}` : ""}&view=list`}
                      className="chip"
                      style={view === "list" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
                    >
                      Liste
                    </Link>
                    <Link
                      href={`/trainer/mesocycles?scope=${scope}&group=${selectedGroup ?? ""}${scope === "athlete" ? `&athlete=${selectedAthlete ?? ""}` : ""}&view=calendar`}
                      className="chip"
                      style={view === "calendar" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
                    >
                      Kalender
                    </Link>
                  </div>
                  <CreateMesocycleDialog scopeType={scope} targetId={targetId} />
                </div>
              </div>

              {view === "calendar" ? (
                <MesocycleTimeline mesocycles={mesocycles} todayIso={todayISO()} />
              ) : mesocycles.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Noch kein Mesozyklus angelegt.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {mesocycles.map((m) => {
                    const endDate = shiftDateISO(m.start_date, m.weeks * 7 - 1);
                    const plans = plansByMesocycle.get(m.id) ?? [];
                    return (
                      <div key={m.id} className="p-4" style={{ background: "var(--dc-surface)" }}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[17px] leading-[1.25]">{m.title}</div>
                            <div className="mt-1 text-xs text-muted">
                              {formatDateCompact(m.start_date)} – {formatDateCompact(endDate)} · {m.weeks}{" "}
                              {m.weeks === 1 ? "Woche" : "Wochen"}
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
                                <span>{p.title}</span>
                                <span className="text-muted">{formatDateCompact(p.date)}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
