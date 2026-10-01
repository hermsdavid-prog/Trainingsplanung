import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import { buildTrainerExportWorkbook } from "@/lib/export/trainer-export";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "trainer") {
    return new NextResponse("Keine Berechtigung.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("group");
  const today = todayISO();
  const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = isDate(fromParam) ? fromParam : shiftDateISO(today, -28);
  const to = isDate(toParam) ? toParam : today;

  const buffer = await buildTrainerExportWorkbook(supabase, { groupId, from, to });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="trainingsplanung-export_${from}_bis_${to}.xlsx"`,
    },
  });
}
