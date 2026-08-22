"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";

const SECTIONS = [
  {
    h: "Verantwortlich",
    t: "Der Verein als Verantwortlicher im Sinne der DSGVO. Kontakt über die im Impressum genannte Adresse.",
  },
  {
    h: "Zweck und Rechtsgrundlage",
    t: "Trainingsplanung und Dokumentation zur Erfüllung des Vereinszwecks (Art. 6 Abs. 1 lit. b und f). Gesundheitsdaten nur auf ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a).",
  },
  {
    h: "Wer sieht was",
    t: "Trainer der eigenen Gruppe sehen Trainingsdaten und — bei Einwilligung — Bereitschaftswerte. Andere Athleten sehen nichts. Vergleiche bleiben im Trainerteam.",
  },
  {
    h: "Speicherdauer",
    t: "Trainingsdaten bleiben für die Dauer der Mitgliedschaft, danach 24 Monate. Gesundheitsdaten werden mit dem Widerruf gelöscht.",
  },
  {
    h: "Deine Rechte",
    t: "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerruf — direkt in der App unter Gesundheit oder über den Verein.",
  },
  {
    h: "Auftragsverarbeiter",
    t: "Hosting und Datenbank laufen bei einem Anbieter in der EU, mit Vertrag nach Art. 28 DSGVO. Keine Weitergabe zu Werbezwecken, keine Analyse durch Dritte.",
  },
];

export function PrivacyPolicyDialog({
  trigger,
  triggerClassName,
}: {
  trigger?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "btn btn-ghost"}
        style={triggerClassName ? undefined : { padding: 0 }}
      >
        {trigger ?? "Datenschutzerklärung"}
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          showCloseButton={false}
          className="dc-dialog max-w-[620px] max-h-[86vh] overflow-y-auto p-[30px_32px_34px]"
        >
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <div className="kicker">Stand 20. August 2026</div>
              <h3 className="mt-2 text-[26px] leading-[1.1]">Datenschutzerklärung</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Schließen"
              className="-mt-1.5 -mr-1.5 flex size-10 flex-none items-center justify-center text-[18px]"
              style={{ background: "transparent", border: 0, color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}
            >
              ✕
            </button>
          </div>
          <div className="mt-5">
            {SECTIONS.map((s) => (
              <div
                key={s.h}
                className="py-3.5"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 10%, transparent)" }}
              >
                <div className="kicker-muted">{s.h}</div>
                <div className="mt-1.5 text-sm leading-[1.6]">{s.t}</div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-primary mt-2" onClick={() => setOpen(false)}>
            Schließen
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
