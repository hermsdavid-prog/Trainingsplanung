"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteGroupAction,
  promoteHeadTrainerAction,
  setGroupAthleteAction,
  setGroupTrainerAction,
  updateGroupAction,
} from "@/lib/actions/groups";

type Person = { id: string; full_name: string };
type Group = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  short_name: string | null;
};

export function GroupManager({
  groups,
  trainers,
  athletes,
  trainerIdsByGroup,
  athleteIdsByGroup,
  headTrainerIdByGroup,
  canManageTeamByGroup,
  canDelete,
}: {
  groups: Group[];
  trainers: Person[];
  athletes: Person[];
  trainerIdsByGroup: Record<string, string[]>;
  athleteIdsByGroup: Record<string, string[]>;
  headTrainerIdByGroup: Record<string, string | null | undefined>;
  canManageTeamByGroup: Record<string, boolean>;
  canDelete: boolean;
}) {
  const [selectedId, setSelectedId] = useState(groups[0]?.id ?? "");
  const [coachQuery, setCoachQuery] = useState("");
  const [athleteQuery, setAthleteQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const group = groups.find((g) => g.id === selectedId) ?? groups[0];
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");

  const groupTrainerIds = trainerIdsByGroup[group?.id ?? ""] ?? [];
  const groupAthleteIds = athleteIdsByGroup[group?.id ?? ""] ?? [];
  const headTrainerId = headTrainerIdByGroup[group?.id ?? ""] ?? null;
  const canManageTeam = canManageTeamByGroup[group?.id ?? ""] ?? false;

  const coachSuggestions = useMemo(() => {
    const q = coachQuery.trim().toLowerCase();
    if (!q) return [];
    return trainers
      .filter((t) => !groupTrainerIds.includes(t.id))
      .filter((t) => t.full_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [coachQuery, trainers, groupTrainerIds]);

  const athleteSuggestions = useMemo(() => {
    const q = athleteQuery.trim().toLowerCase();
    if (!q) return [];
    return athletes
      .filter((a) => !groupAthleteIds.includes(a.id))
      .filter((a) => a.full_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [athleteQuery, athletes, groupAthleteIds]);

  function selectGroup(g: Group) {
    setSelectedId(g.id);
    setName(g.name);
    setDescription(g.description ?? "");
    setCoachQuery("");
    setAthleteQuery("");
    setError(undefined);
  }

  function saveMeta() {
    if (!group) return;
    const formData = new FormData();
    formData.set("group_id", group.id);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("color", group.color);
    formData.set("short_name", group.short_name ?? "");
    startTransition(async () => {
      const result = await updateGroupAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function toggleTrainer(trainerId: string, assign: boolean) {
    if (!group) return;
    startTransition(async () => {
      const result = await setGroupTrainerAction(group.id, trainerId, assign);
      if (result.error) {
        toast.error(result.error);
      } else {
        setCoachQuery("");
        router.refresh();
      }
    });
  }

  function promoteTrainer(trainerId: string) {
    if (!group) return;
    startTransition(async () => {
      const result = await promoteHeadTrainerAction(group.id, trainerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function toggleAthlete(athleteId: string, assign: boolean) {
    if (!group) return;
    startTransition(async () => {
      const result = await setGroupAthleteAction(group.id, athleteId, assign);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAthleteQuery("");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!group) return;
    if (!confirm(`Gruppe "${group.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteGroupAction(group.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (!group) return null;

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className="chip"
            onClick={() => selectGroup(g)}
            style={{
              background: g.id === group.id ? "var(--dc-accent)" : "transparent",
              color: g.id === group.id ? "var(--dc-bg)" : "var(--dc-text)",
              maxWidth: "min(100%, 320px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.name} · {(athleteIdsByGroup[g.id] ?? []).length}
          </button>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-11 lg:grid-cols-2">
        <div>
          <div className="field">
            <label htmlFor="group-name">Name der Gruppe</label>
            <input
              id="group-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={canManageTeam ? saveMeta : undefined}
              readOnly={!canManageTeam}
            />
          </div>
          <div className="field mt-3.5">
            <label htmlFor="group-desc">Rhythmus</label>
            <input
              id="group-desc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={canManageTeam ? saveMeta : undefined}
              readOnly={!canManageTeam}
              placeholder="z. B. 3 Einheiten pro Woche"
            />
          </div>
          {error && (
            <div className="mt-2 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
              {error}
            </div>
          )}

          <div className="kicker-muted mt-6">Trainer · {groupTrainerIds.length} Personen</div>
          <div className="mt-2">
            {groupTrainerIds.length === 0 && (
              <p className="py-2 text-sm text-muted">Noch keine Trainer zugeordnet.</p>
            )}
            {groupTrainerIds.map((id) => {
              const t = trainers.find((x) => x.id === id);
              if (!t) return null;
              const isHead = id === headTrainerId;
              return (
                <div
                  key={id}
                  className="py-2.5"
                  style={{ borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 10%, transparent)" }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px]">{t.full_name}</span>
                    <span
                      className="text-xs"
                      style={{
                        color: isHead
                          ? "var(--dc-accent-700)"
                          : "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                      }}
                    >
                      {isHead ? "Haupttrainer" : "Co-Trainer"}
                    </span>
                  </div>
                  {canManageTeam && (
                    <div className="mt-1.5 flex gap-2">
                      {!isHead && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={isPending}
                          onClick={() => promoteTrainer(id)}
                        >
                          zum Haupttrainer machen
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={isPending}
                        onClick={() => toggleTrainer(id, false)}
                      >
                        entfernen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {canManageTeam && (
            <>
              <div className="field mt-3.5">
                <label htmlFor="coach-query">Trainer hinzufügen</label>
                <input
                  id="coach-query"
                  className="input"
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                  placeholder="Namen tippen"
                />
              </div>
              {coachSuggestions.length > 0 && (
                <div className="mt-1.5">
                  {coachSuggestions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm">{t.full_name}</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={isPending}
                        onClick={() => toggleTrainer(t.id, true)}
                      >
                        als Co-Trainer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!canManageTeam && (
            <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
              Nur der Haupttrainer darf Gruppe und Team ändern.
            </p>
          )}
        </div>

        <div>
          <div className="kicker-muted">Athleten · {groupAthleteIds.length} Personen</div>
          <div className="mt-2">
            {groupAthleteIds.length === 0 && (
              <p className="py-2 text-sm text-muted">Noch keine Athleten zugeordnet.</p>
            )}
            {groupAthleteIds.map((id) => {
              const a = athletes.find((x) => x.id === id);
              if (!a) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 py-2.5"
                  style={{ borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 10%, transparent)" }}
                >
                  <span className="text-[15px]">{a.full_name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={isPending}
                    onClick={() => toggleAthlete(id, false)}
                  >
                    entfernen
                  </button>
                </div>
              );
            })}
          </div>
          <div className="field mt-3.5">
            <label htmlFor="athlete-query">Athlet hinzufügen</label>
            <input
              id="athlete-query"
              className="input"
              value={athleteQuery}
              onChange={(e) => setAthleteQuery(e.target.value)}
              placeholder="Namen tippen"
            />
          </div>
          {athleteSuggestions.length > 0 && (
            <div className="mt-1.5">
              {athleteSuggestions.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm">{a.full_name}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isPending}
                    onClick={() => toggleAthlete(a.id, true)}
                  >
                    zuordnen
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 text-[13px] leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
            Alle Trainer der Gruppe sehen alle Daten. Der Haupttrainer darf zusätzlich Gruppe und
            Team ändern.
          </p>

          {canDelete && (
            <button
              type="button"
              className="btn btn-danger mt-5"
              disabled={isPending}
              onClick={handleDelete}
            >
              Gruppe löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
