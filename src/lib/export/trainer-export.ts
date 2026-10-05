import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Supabase = SupabaseClient<Database>;

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width?: number }[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };
  return sheet;
}

// Resolves the athletes/groups a trainer's export should cover: either every
// athlete across every group this trainer manages (groups_select /
// group_athletes RLS already scopes both to the trainer), or just one group.
async function resolveScope(supabase: Supabase, groupId: string | null) {
  const { data: groups } = await supabase.from("groups").select("id, name").order("name");
  const scopedGroups = groupId ? (groups ?? []).filter((g) => g.id === groupId) : (groups ?? []);
  const groupIds = scopedGroups.map((g) => g.id);

  const { data: groupAthleteRows } = groupIds.length
    ? await supabase.from("group_athletes").select("group_id, athlete_id, profiles(full_name)").in("group_id", groupIds)
    : { data: [] };

  const athleteName = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteName.set(row.athlete_id, row.profiles.full_name);
  }
  const athleteIds = Array.from(athleteName.keys());
  const groupName = new Map(scopedGroups.map((g) => [g.id, g.name]));

  return { groupIds, athleteIds, athleteName, groupName };
}

export async function buildTrainerExportWorkbook(
  supabase: Supabase,
  { groupId, from, to }: { groupId: string | null; from: string; to: string }
): Promise<ExcelJS.Buffer> {
  const { groupIds, athleteIds, athleteName, groupName } = await resolveScope(supabase, groupId);

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  // --- Trainingspläne (assigned plans + their exercises) -------------------
  const plansSheet = addSheet(workbook, "Trainingspläne", [
    { header: "Datum", key: "date", width: 12 },
    { header: "Kategorie", key: "category", width: 16 },
    { header: "Titel", key: "title", width: 24 },
    { header: "Zielgruppe", key: "target", width: 20 },
    { header: "Sektion", key: "section", width: 14 },
    { header: "Übung", key: "exercise", width: 26 },
    { header: "Sätze", key: "sets", width: 10 },
    { header: "Wdh./Dauer", key: "reps", width: 14 },
    { header: "Pause", key: "rest", width: 10 },
    { header: "Notizen", key: "notes", width: 30 },
  ]);

  const orClause =
    groupIds.length && athleteIds.length
      ? `group_id.in.(${groupIds.join(",")}),athlete_id.in.(${athleteIds.join(",")})`
      : groupIds.length
        ? `group_id.in.(${groupIds.join(",")})`
        : athleteIds.length
          ? `athlete_id.in.(${athleteIds.join(",")})`
          : null;

  const { data: plans } = orClause
    ? await supabase
        .from("training_plans")
        .select("id, date, category_label, title, scope_type, group_id, athlete_id")
        .gte("date", from)
        .lte("date", to)
        .or(orClause)
        .order("date")
    : { data: [] };

  const planIds = (plans ?? []).map((p) => p.id);
  const { data: items } = planIds.length
    ? await supabase
        .from("training_plan_items")
        .select("training_plan_id, section, exercise_name, sets, reps_or_duration, rest_time, notes, position")
        .in("training_plan_id", planIds)
        .order("position")
    : { data: [] };

  const itemsByPlan = new Map<string, typeof items>();
  for (const item of items ?? []) {
    itemsByPlan.set(item.training_plan_id, [...(itemsByPlan.get(item.training_plan_id) ?? []), item]);
  }

  for (const plan of plans ?? []) {
    const target =
      plan.scope_type === "group"
        ? (groupName.get(plan.group_id ?? "") ?? "Gruppe")
        : (athleteName.get(plan.athlete_id ?? "") ?? "Einzeln");
    const planItems = itemsByPlan.get(plan.id) ?? [];
    if (planItems.length === 0) {
      plansSheet.addRow({ date: plan.date, category: plan.category_label, title: plan.title, target, section: "", exercise: "", sets: "", reps: "", rest: "", notes: "" });
      continue;
    }
    for (const item of planItems) {
      plansSheet.addRow({
        date: plan.date,
        category: plan.category_label,
        title: plan.title,
        target,
        section: item.section,
        exercise: item.exercise_name,
        sets: item.sets ?? "",
        reps: item.reps_or_duration ?? "",
        rest: item.rest_time ?? "",
        notes: item.notes ?? "",
      });
    }
  }

  // --- Ergebnisse (actually logged sets) ------------------------------------
  const resultsSheet = addSheet(workbook, "Ergebnisse", [
    { header: "Datum", key: "date", width: 12 },
    { header: "Athlet", key: "athlete", width: 22 },
    { header: "Übung", key: "exercise", width: 26 },
    { header: "Satz", key: "setNumber", width: 8 },
    { header: "Satzart", key: "setType", width: 16 },
    { header: "Seite", key: "side", width: 10 },
    { header: "Wert", key: "value", width: 10 },
    { header: "Wdh.", key: "reps", width: 8 },
    { header: "RIR", key: "rir", width: 8 },
    { header: "Einheit", key: "unit", width: 10 },
    { header: "Kontaktzeit (ms)", key: "contactMs", width: 16 },
    { header: "RSI", key: "rsi", width: 8 },
  ]);

  // Paged: a single request stops at the API's row limit (1000), which cut
  // longer export periods off without notice.
  const results = [];
  for (let offset = 0; athleteIds.length > 0; offset += 1000) {
    const { data: page } = await supabase
      .from("exercise_results")
      .select("athlete_id, date, set_number, value, reps, rir, unit, set_type, side, contact_ms, rsi, exercises(name)")
      .in("athlete_id", athleteIds)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(offset, offset + 999);
    results.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }

  for (const r of results) {
    resultsSheet.addRow({
      date: r.date,
      athlete: athleteName.get(r.athlete_id) ?? "",
      exercise: r.exercises?.name ?? "",
      setNumber: r.set_number,
      setType: r.set_type,
      side: r.side ?? "",
      value: r.value,
      reps: r.reps ?? "",
      rir: r.rir ?? "",
      unit: r.unit ?? "",
      contactMs: r.contact_ms ?? "",
      rsi: r.rsi ?? "",
    });
  }

  // --- Gesundheitswerte -----------------------------------------------------
  const healthSheet = addSheet(workbook, "Gesundheitswerte", [
    { header: "Datum", key: "date", width: 12 },
    { header: "Athlet", key: "athlete", width: 22 },
    { header: "HRV", key: "hrv", width: 10 },
    { header: "Ruhe-HF", key: "restingHr", width: 10 },
    { header: "Wohlbefinden", key: "wellbeing", width: 14 },
  ]);

  const { data: healthLogs } = athleteIds.length
    ? await supabase
        .from("health_logs")
        .select("athlete_id, date, hrv, resting_hr, wellbeing")
        .in("athlete_id", athleteIds)
        .gte("date", from)
        .lte("date", to)
        .order("date")
    : { data: [] };

  for (const log of healthLogs ?? []) {
    healthSheet.addRow({
      date: log.date,
      athlete: athleteName.get(log.athlete_id) ?? "",
      hrv: log.hrv ?? "",
      restingHr: log.resting_hr ?? "",
      wellbeing: log.wellbeing ?? "",
    });
  }

  // --- Trainingsziele (current goals, not date-ranged — goals aren't a
  // time series, they belong to a Mesozyklus rather than a single day) -----
  const goalsSheet = addSheet(workbook, "Trainingsziele", [
    { header: "Athlet", key: "athlete", width: 22 },
    { header: "Mesozyklus", key: "mesocycle", width: 24 },
    { header: "Ziel", key: "text", width: 40 },
    { header: "Erreicht", key: "achieved", width: 10 },
    { header: "Erreicht am", key: "achievedAt", width: 14 },
    { header: "Erstellt von", key: "author", width: 14 },
  ]);

  if (athleteIds.length) {
    const [{ data: groupMesos }, { data: athleteMesos }] = await Promise.all([
      groupIds.length
        ? supabase.from("training_mesocycles").select("id, title").in("group_id", groupIds)
        : Promise.resolve({ data: [] }),
      supabase.from("training_mesocycles").select("id, title").in("athlete_id", athleteIds),
    ]);
    const mesoTitle = new Map<string, string>();
    for (const m of [...(groupMesos ?? []), ...(athleteMesos ?? [])]) mesoTitle.set(m.id, m.title);
    const mesoIds = Array.from(mesoTitle.keys());

    const { data: goals } = mesoIds.length
      ? await supabase
          .from("mesocycle_goals")
          .select("athlete_id, mesocycle_id, text, achieved_at, created_by")
          .in("athlete_id", athleteIds)
          .in("mesocycle_id", mesoIds)
          .order("position")
      : { data: [] };

    for (const g of goals ?? []) {
      goalsSheet.addRow({
        athlete: athleteName.get(g.athlete_id) ?? "",
        mesocycle: mesoTitle.get(g.mesocycle_id) ?? "",
        text: g.text,
        achieved: g.achieved_at ? "Ja" : "Nein",
        achievedAt: g.achieved_at ? g.achieved_at.slice(0, 10) : "",
        author: g.created_by === g.athlete_id ? "Athlet" : "Trainer",
      });
    }
  }

  return workbook.xlsx.writeBuffer();
}
