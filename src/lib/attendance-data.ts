import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { dateChunks, type AttendanceAbsence, type AttendanceSession } from "@/lib/attendance";

type Client = SupabaseClient<Database>;

export type AttendanceRoster = { id: string; name: string; startDate: string };

// Rosters the user may see (RLS), with the first day their schedule applies.
export async function loadRosters(supabase: Client): Promise<AttendanceRoster[]> {
  const [{ data: rosters }, { data: schedule }] = await Promise.all([
    supabase.from("attendance_rosters").select("id, name").order("name"),
    supabase.from("attendance_schedule").select("roster_id, valid_from"),
  ]);
  return (rosters ?? []).map((r) => {
    const froms = (schedule ?? []).filter((s) => s.roster_id === r.id).map((s) => s.valid_from).sort();
    return { id: r.id, name: r.name, startDate: froms[0] ?? "9999-12-31" };
  });
}

// Everyone in any of the roster's groups, once (an athlete in two groups
// still appears a single time).
export async function loadRosterMembers(supabase: Client, rosterId: string): Promise<{ id: string; full_name: string }[]> {
  const { data: groups } = await supabase.from("attendance_roster_groups").select("group_id").eq("roster_id", rosterId);
  const groupIds = (groups ?? []).map((g) => g.group_id);
  if (groupIds.length === 0) return [];
  const { data: rows } = await supabase
    .from("group_athletes")
    .select("athlete_id, profiles(full_name)")
    .in("group_id", groupIds);
  const byId = new Map<string, string>();
  for (const row of rows ?? []) {
    const profile = row.profiles as { full_name: string } | null;
    byId.set(row.athlete_id, profile?.full_name ?? "");
  }
  return Array.from(byId, ([id, full_name]) => ({ id, full_name })).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "de")
  );
}

// Materialize the weekly schedule into sessions for [from, to] (idempotent),
// then return all sessions and absences in that range.
export async function loadSessions(
  supabase: Client,
  roster: AttendanceRoster,
  from: string,
  to: string
): Promise<{ sessions: AttendanceSession[]; absences: AttendanceAbsence[] }> {
  const start = from < roster.startDate ? roster.startDate : from;
  for (const chunk of dateChunks(start, to)) {
    await supabase.rpc("ensure_attendance_sessions", { p_roster: roster.id, p_from: chunk.from, p_to: chunk.to });
  }
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, date, start_time, end_time, kind, note, cancelled_at")
    .eq("roster_id", roster.id)
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("start_time");
  const ids = (sessions ?? []).map((s) => s.id);
  const absences: AttendanceAbsence[] = [];
  // Chunked so a long quota period stays under URL length limits.
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabase
      .from("attendance_absences")
      .select("session_id, athlete_id, self_reported")
      .in("session_id", ids.slice(i, i + 150));
    absences.push(...(data ?? []));
  }
  return { sessions: sessions ?? [], absences };
}
