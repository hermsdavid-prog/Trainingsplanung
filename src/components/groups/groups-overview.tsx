import { createClient } from "@/lib/supabase/server";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { GroupManager } from "@/components/groups/group-manager";

export async function GroupsOverview({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [{ data: groups }, { data: trainerProfiles }, { data: athleteProfiles }] =
    await Promise.all([
      supabase.from("groups").select("id, name, description, color, short_name").order("name"),
      supabase.from("profiles").select("id, full_name").eq("role", "trainer").order("full_name"),
      supabase.from("profiles").select("id, full_name").eq("role", "athlete").order("full_name"),
    ]);

  const groupIds = (groups ?? []).map((g) => g.id);

  const [{ data: groupTrainers }, { data: groupAthletes }] = await Promise.all([
    groupIds.length
      ? supabase
          .from("group_trainers")
          .select("group_id, trainer_id, is_head")
          .in("group_id", groupIds)
      : Promise.resolve({ data: [] as { group_id: string; trainer_id: string; is_head: boolean }[] }),
    groupIds.length
      ? supabase.from("group_athletes").select("group_id, athlete_id").in("group_id", groupIds)
      : Promise.resolve({ data: [] as { group_id: string; athlete_id: string }[] }),
  ]);

  const trainerIdsByGroup = new Map<string, string[]>();
  const headTrainerIdByGroup = new Map<string, string | null>();
  for (const row of groupTrainers ?? []) {
    trainerIdsByGroup.set(row.group_id, [
      ...(trainerIdsByGroup.get(row.group_id) ?? []),
      row.trainer_id,
    ]);
    if (row.is_head) headTrainerIdByGroup.set(row.group_id, row.trainer_id);
  }
  const athleteIdsByGroup = new Map<string, string[]>();
  for (const row of groupAthletes ?? []) {
    athleteIdsByGroup.set(row.group_id, [
      ...(athleteIdsByGroup.get(row.group_id) ?? []),
      row.athlete_id,
    ]);
  }

  // A trainer may manage a group's roster/settings when they're its head trainer,
  // or when the group has no head trainer yet (transitional default, see groups.ts).
  const canManageTeamByGroup = new Map<string, boolean>();
  for (const g of groups ?? []) {
    const headId = headTrainerIdByGroup.get(g.id) ?? null;
    canManageTeamByGroup.set(
      g.id,
      isAdmin || headId === null || headId === currentUser?.id
    );
  }

  const totalAthletes = new Set((groupAthletes ?? []).map((r) => r.athlete_id)).size;

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="kicker">
            {(groups ?? []).length} Gruppen · {totalAthletes} Athleten
          </div>
          <h2 className="mt-2.5 text-[34px] leading-[1.05]">Gruppen</h2>
        </div>
        <CreateGroupDialog />
      </div>

      {(!groups || groups.length === 0) ? (
        <p className="mt-6 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
          Noch keine Gruppen angelegt.
        </p>
      ) : (
        <GroupManager
          groups={groups}
          trainers={trainerProfiles ?? []}
          athletes={athleteProfiles ?? []}
          trainerIdsByGroup={Object.fromEntries(trainerIdsByGroup)}
          athleteIdsByGroup={Object.fromEntries(athleteIdsByGroup)}
          headTrainerIdByGroup={Object.fromEntries(headTrainerIdByGroup)}
          canManageTeamByGroup={Object.fromEntries(canManageTeamByGroup)}
          canDelete={isAdmin}
        />
      )}
    </div>
  );
}
