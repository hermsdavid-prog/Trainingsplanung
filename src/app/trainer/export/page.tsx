import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";

export default async function TrainerExportPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  const today = todayISO();
  const defaultFrom = shiftDateISO(today, -28);

  return (
    <div>
      <div className="kicker">Export</div>
      <h2 className="mt-1.5 text-[27px] leading-[1.08]">Daten exportieren</h2>
      <p className="mt-2.5 max-w-[560px] text-sm leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        Excel-Datei mit Trainingsplänen, Ergebnissen, Gesundheitswerten und Trainingszielen der ausgewählten Gruppe
        (oder aller Athleten) im gewählten Zeitraum. Trainingsziele sind nicht an den Zeitraum gebunden — es werden
        immer die aktuellen Ziele exportiert.
      </p>

      <form action="/trainer/export/download" method="GET" className="mt-6 flex max-w-[520px] flex-col gap-3.5">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="export-group">Gruppe</label>
          <select id="export-group" name="group" className="input" defaultValue="">
            <option value="">Alle Athleten</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3.5">
          <div className="field flex-1" style={{ margin: 0 }}>
            <label htmlFor="export-from">Von</label>
            <input id="export-from" name="from" type="date" className="input" defaultValue={defaultFrom} />
          </div>
          <div className="field flex-1" style={{ margin: 0 }}>
            <label htmlFor="export-to">Bis</label>
            <input id="export-to" name="to" type="date" className="input" defaultValue={today} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary mt-1.5 self-start">
          Excel exportieren
        </button>
      </form>
    </div>
  );
}
