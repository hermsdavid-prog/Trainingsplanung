"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveExerciseNotesAction } from "@/lib/actions/feedback";
import { formatDateCompact } from "@/lib/date";

export type SelfNote = { text: string; updatedAt: string };
export type ExerciseNoteState = { self: SelfNote | null; coach: string };

// The athlete's own reminder from an earlier session, shown at the top of
// the exercise so it's read before the first set.
export function SelfNoteReminder({ note }: { note: SelfNote | null }) {
  if (!note) return null;
  return (
    <div className="mt-2.5 px-2.5 py-2 text-[13.5px] leading-[1.45]" style={{ background: "var(--dc-accent-100)" }}>
      <span className="font-semibold">📝 Deine Notiz</span>
      <span style={{ color: "var(--dc-muted)" }}> · {formatDateCompact(note.updatedAt.slice(0, 10))}</span>
      <div style={{ overflowWrap: "anywhere" }}>{note.text}</div>
    </div>
  );
}

// "✎ Notiz" button for the exercise's bottom row plus its editor: a private
// note for next time and (for athletes) a message to the trainer.
export function ExerciseNotesButton({
  state,
  open,
  onToggle,
}: {
  state: ExerciseNoteState;
  open: boolean;
  onToggle: () => void;
}) {
  const count = (state.self ? 1 : 0) + (state.coach ? 1 : 0);
  return (
    <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={onToggle}>
      ✎ Notiz{count > 0 ? ` (${count})` : ""}
    </button>
  );
}

export function ExerciseNotesPanel({
  itemId,
  noteKey,
  state,
  open,
  allowCoachHint,
  onSaved,
  onClose,
}: {
  itemId: string;
  noteKey: string;
  state: ExerciseNoteState;
  open: boolean;
  allowCoachHint: boolean;
  onSaved: (next: ExerciseNoteState) => void;
  onClose: () => void;
}) {
  const [selfText, setSelfText] = useState(state.self?.text ?? "");
  const [coachText, setCoachText] = useState(state.coach);
  const [saving, setSaving] = useState(false);

  if (!open) {
    // Collapsed: the message already sent to the trainer stays visible.
    if (!allowCoachHint || !state.coach) return null;
    return (
      <div className="mt-2 text-[13px] leading-[1.45]" style={{ color: "var(--dc-muted)", overflowWrap: "anywhere" }}>
        💬 An den Trainer: <span style={{ color: "var(--dc-text)" }}>{state.coach}</span>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    const result = await saveExerciseNotesAction(itemId, noteKey, {
      selfNote: selfText,
      ...(allowCoachHint ? { coachNote: coachText } : {}),
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const trimmedSelf = selfText.trim();
    onSaved({
      self: trimmedSelf ? { text: trimmedSelf, updatedAt: result.selfUpdatedAt ?? new Date().toISOString() } : null,
      coach: allowCoachHint ? coachText.trim() : state.coach,
    });
    toast.success(allowCoachHint && coachText.trim() && coachText.trim() !== state.coach ? "Gespeichert — dein Trainer sieht den Hinweis." : "Notiz gespeichert.");
    onClose();
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5 p-2.5" style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-divider)" }}>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor={`self-note-${itemId}`}>📝 Für mich – nächstes Mal</label>
        <textarea
          id={`self-note-${itemId}`}
          className="input"
          rows={2}
          maxLength={500}
          value={selfText}
          onChange={(e) => setSelfText(e.target.value)}
          placeholder="z. B. langsam runter, Griff enger"
          style={{ resize: "vertical", minHeight: 64 }}
        />
      </div>
      {allowCoachHint && (
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`coach-note-${itemId}`}>💬 Hinweis an den Trainer</label>
          <textarea
            id={`coach-note-${itemId}`}
            className="input"
            rows={2}
            maxLength={1000}
            value={coachText}
            onChange={(e) => setCoachText(e.target.value)}
            placeholder="z. B. Schmerzen im Knie"
            style={{ resize: "vertical", minHeight: 64 }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Wird gespeichert…" : "Speichern"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={onClose}>
          Abbrechen
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--dc-muted)" }}>
        Deine Notiz siehst nur du — sie erscheint beim nächsten Training mit dieser Übung wieder.
        {allowCoachHint ? " Den Hinweis sieht dein Trainer." : ""}
      </p>
    </div>
  );
}
