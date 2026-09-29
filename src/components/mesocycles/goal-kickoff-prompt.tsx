"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  saveKickoffGoalsAction,
  skipKickoffGoalsAction,
  toggleMesocycleGoalAction,
} from "@/lib/actions/mesocycle-goals";

export type KickoffRecap = {
  title: string;
  total: number;
  achieved: number;
  openGoals: { id: string; text: string }[];
};

const PLACEHOLDERS = ["z. B. 5 saubere Klimmzüge", "z. B. Kniebeuge 5 × 100 kg", "z. B. jede Einheit Mobility vorher"];

function recapMessage(r: KickoffRecap, achieved: number) {
  if (achieved >= r.total) {
    return `🎉 Alle ${r.total} Ziele aus „${r.title}“ erreicht — stark! Genau so geht es weiter.`;
  }
  if (achieved > 0) {
    return `💪 ${achieved} von ${r.total} Zielen aus „${r.title}“ geschafft — das ist echter Fortschritt. Darauf baust du jetzt auf.`;
  }
  return `Neuer Block, neue Chance. Aus „${r.title}“ ist noch nichts abgehakt — vielleicht hast du ja doch schon etwas erreicht?`;
}

// Opens on the athlete's Startseite in the first week of a new Mesozyklus
// they haven't set own goals for yet: a positive look back at the last
// block's goals (still-open ones can be ticked right here) and three fields
// for this block's goals. "Überspringen" stops asking for this block;
// closing the window just asks again on the next visit.
export function GoalKickoffPrompt({
  mesocycleId,
  mesocycleTitle,
  scopeLabel,
  rangeLabel,
  recap,
}: {
  mesocycleId: string;
  mesocycleTitle: string;
  scopeLabel: string;
  rangeLabel: string;
  recap: KickoffRecap | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [texts, setTexts] = useState(["", "", ""]);
  const [achieved, setAchieved] = useState(recap?.achieved ?? 0);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filled = texts.filter((t) => t.trim()).length;

  function save() {
    startTransition(async () => {
      const result = await saveKickoffGoalsAction(mesocycleId, texts);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Deine Ziele stehen — viel Erfolg im neuen Block! 💪");
      setOpen(false);
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      const result = await skipKickoffGoalsAction(mesocycleId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function tick(goalId: string) {
    if (ticked.has(goalId)) return;
    setTicked((prev) => new Set(prev).add(goalId));
    setAchieved((a) => a + 1);
    startTransition(async () => {
      const result = await toggleMesocycleGoalAction(goalId, true);
      if (result.error) {
        toast.error(result.error);
        setTicked((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
        setAchieved((a) => a - 1);
        return;
      }
      toast.success("Abgehakt — gut gemacht! 🎉");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="dc-dialog max-h-[calc(100dvh-2rem)] max-w-[480px] overflow-y-auto">
        <div className="min-w-0">
          <div className="kicker">Neuer Mesozyklus</div>
          <DialogTitle className="mt-1.5 text-[22px] leading-[1.15]" style={{ fontFamily: "var(--dc-font-heading)" }}>
            {mesocycleTitle}
          </DialogTitle>
          <p className="mt-1 text-[13px]" style={{ color: "var(--dc-muted)" }}>
            {scopeLabel} · {rangeLabel}
          </p>

          {recap && (
            <div className="mt-4 p-3" style={{ background: "var(--dc-accent-100)" }}>
              <p className="text-[14px] leading-[1.45]">{recapMessage(recap, achieved)}</p>
              {recap.openGoals.length > 0 && achieved < recap.total && (
                <div className="mt-2.5">
                  <div className="text-xs" style={{ color: "var(--dc-muted)" }}>
                    Noch offen — schon geschafft? Dann hak es ab:
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {recap.openGoals.map((g) => (
                      <label key={g.id} className="flex items-start gap-2 text-[14px]">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={ticked.has(g.id)}
                          disabled={ticked.has(g.id)}
                          onChange={() => tick(g.id)}
                        />
                        <span style={{ textDecoration: ticked.has(g.id) ? "line-through" : "none" }}>{g.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-[15px] leading-[1.45]">
            Was willst du in diesem Block erreichen? Setz dir <strong>3 Ziele</strong> — klar und messbar.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {texts.map((t, i) => (
              <div key={i} className="field" style={{ margin: 0 }}>
                <label htmlFor={`kickoff-goal-${i}`}>Ziel {i + 1}</label>
                <input
                  id={`kickoff-goal-${i}`}
                  className="input"
                  value={t}
                  maxLength={140}
                  placeholder={PLACEHOLDERS[i]}
                  onChange={(e) => setTexts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button type="button" className="btn btn-primary btn-block" disabled={isPending || filled === 0} onClick={save}>
              {isPending ? "Wird gespeichert…" : filled > 0 && filled < 3 ? `${filled} ${filled === 1 ? "Ziel" : "Ziele"} speichern` : "Ziele speichern"}
            </button>
            <button type="button" className="btn btn-ghost btn-block" disabled={isPending} onClick={skip}>
              Überspringen
            </button>
          </div>
          <p className="mt-2 text-center text-xs" style={{ color: "var(--dc-muted)" }}>
            Deine Ziele sieht auch dein Trainer. Du kannst sie später unter „Meine Ziele“ abhaken.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
