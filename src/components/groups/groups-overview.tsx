import { createClient } from "@/lib/supabase/server";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { GroupDetailDialog } from "@/components/groups/group-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function GroupsOverview({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient();

  const [{ data: groups }, { data: trainerProfiles }, { data: athleteProfiles }] =
    await Promise.all([
      supabase.from("groups").select("id, name, description, color, short_name").order("name"),
      supabase.from("profiles").select("id, full_name").eq("role", "trainer").order("full_name"),
      supabase.from("profiles").select("id, full_name").eq("role", "athlete").order("full_name"),
    ]);

  const groupIds = (groups ?? []).map((g) => g.id);

  const [{ data: groupTrainers }, { data: groupAthletes }] = await Promise.all([
    groupIds.length
      ? supabase.from("group_trainers").select("group_id, trainer_id").in("group_id", groupIds)
      : Promise.resolve({ data: [] as { group_id: string; trainer_id: string }[] }),
    groupIds.length
      ? supabase.from("group_athletes").select("group_id, athlete_id").in("group_id", groupIds)
      : Promise.resolve({ data: [] as { group_id: string; athlete_id: string }[] }),
  ]);

  const trainerIdsByGroup = new Map<string, string[]>();
  for (const row of groupTrainers ?? []) {
    trainerIdsByGroup.set(row.group_id, [
      ...(trainerIdsByGroup.get(row.group_id) ?? []),
      row.trainer_id,
    ]);
  }
  const athleteIdsByGroup = new Map<string, string[]>();
  for (const row of groupAthletes ?? []) {
    athleteIdsByGroup.set(row.group_id, [
      ...(athleteIdsByGroup.get(row.group_id) ?? []),
      row.athlete_id,
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gruppen</h1>
          <p className="text-sm text-muted-foreground">
            Trainingsgruppen anlegen und Trainer/Athleten zuordnen.
          </p>
        </div>
        <CreateGroupDialog />
      </div>

      {(!groups || groups.length === 0) && (
        <p className="text-sm text-muted-foreground">Noch keine Gruppen angelegt.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(groups ?? []).map((group) => {
          const assignedTrainerIds = trainerIdsByGroup.get(group.id) ?? [];
          const assignedAthleteIds = athleteIdsByGroup.get(group.id) ?? [];
          return (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  {group.short_name && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {group.short_name}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {assignedTrainerIds.length} Trainer · {assignedAthleteIds.length} Athleten
                </p>
                <GroupDetailDialog
                  group={group}
                  trainers={trainerProfiles ?? []}
                  athletes={athleteProfiles ?? []}
                  assignedTrainerIds={assignedTrainerIds}
                  assignedAthleteIds={assignedAthleteIds}
                  canDelete={isAdmin}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
