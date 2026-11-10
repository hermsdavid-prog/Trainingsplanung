"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPhases,
  defaultSelection,
  formatClock,
  totalSeconds,
  type TimerItem,
  type TimerMode,
  type TimerPhase,
} from "@/lib/interval-timer";

const PREPARE_SEC = 10;
const SOUND_KEY = "interval-timer-sound";

// ---------- sound ----------
// Tones are generated with Web Audio (no files to load). iOS only plays
// audio after a user gesture, so everything below runs inside the Start
// (or "Ton testen") click handler.
//
// iOS also treats Web Audio like a ringtone: with the ring/silent switch
// on, it stays mute. Two ways out of that, both needed for older and newer
// iOS: the Audio Session API ("playback" ignores the switch, iOS 17+), and,
// where that API is missing, a looping silent <audio> element, which moves
// the page into the media-playback category while it plays.

type AudioCtxCtor = typeof AudioContext;
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

export type TimerAudio = { ctx: AudioContext | null; release: () => void };

function createAudioContext(): AudioContext | null {
  const Ctor: AudioCtxCtor | undefined =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext);
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

// Must be called synchronously from a click/tap handler.
function startAudio(): TimerAudio {
  const nav = navigator as AudioSessionNav;
  const previousType = nav.audioSession?.type;
  let silent: HTMLAudioElement | null = null;
  try {
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    // Not settable here: fall through to the <audio> element.
  }
  if (!nav.audioSession) {
    try {
      silent = new Audio("/sounds/silence.wav");
      silent.loop = true;
      silent.setAttribute("playsinline", "");
      void silent.play().catch(() => {});
    } catch {
      silent = null;
    }
  }

  const ctx = createAudioContext();
  if (ctx) {
    void ctx.resume().catch(() => {});
    // Starting a (silent) source inside the gesture unlocks older iOS.
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Nothing to unlock.
    }
  }

  return {
    ctx,
    release: () => {
      void ctx?.close().catch(() => {});
      if (silent) {
        silent.pause();
        silent.removeAttribute("src");
        silent.load();
      }
      try {
        if (nav.audioSession && previousType) nav.audioSession.type = previousType;
      } catch {
        // Leave it as it is.
      }
    },
  };
}

function tone(ctx: AudioContext, freq: number, ms: number, delayMs = 0, volume = 0.35) {
  const start = ctx.currentTime + delayMs / 1000;
  const end = start + ms / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.setValueAtTime(volume, end - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

const SOUNDS = {
  tick: (ctx: AudioContext) => tone(ctx, 880, 120),
  work: (ctx: AudioContext) => tone(ctx, 1320, 650),
  rest: (ctx: AudioContext) => tone(ctx, 660, 450),
  side: (ctx: AudioContext) => {
    tone(ctx, 1320, 140);
    tone(ctx, 1320, 140, 220);
  },
  done: (ctx: AudioContext) => {
    tone(ctx, 990, 200);
    tone(ctx, 1320, 200, 250);
    tone(ctx, 1760, 500, 500);
  },
};

function readSoundPref(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeSoundPref(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the toggle still works for this run.
  }
}

// ---------- entry button + setup sheet ----------

export function IntervalTimerButton({ items, className = "" }: { items: TimerItem[]; className?: string }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [run, setRun] = useState<{ phases: TimerPhase[]; audio: TimerAudio } | null>(null);
  // Leaving the page mid-run: hand the audio session back.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  useEffect(() => () => runRef.current?.audio.release(), []);

  if (items.length === 0) return null;

  return (
    <>
      <button type="button" className={`btn btn-secondary ${className}`} onClick={() => setSetupOpen(true)}>
        <span aria-hidden>⏱</span> Intervall-Timer
      </button>
      {setupOpen && (
        <TimerSetup
          items={items}
          onClose={() => setSetupOpen(false)}
          onStart={(phases) => {
            const audio = startAudio();
            setSetupOpen(false);
            setRun({ phases, audio });
          }}
        />
      )}
      {run && (
        <TimerRunner
          phases={run.phases}
          audio={run.audio.ctx}
          onClose={() => {
            run.audio.release();
            setRun(null);
          }}
        />
      )}
    </>
  );
}

function TimerSetup({
  items,
  onClose,
  onStart,
}: {
  items: TimerItem[];
  onClose: () => void;
  onStart: (phases: TimerPhase[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultSelection(items)));
  const [mode, setMode] = useState<TimerMode>(() => (defaultSelection(items).length > 0 ? "circuit" : "sequence"));

  const chosen = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);
  const phases = useMemo(() => buildPhases(chosen, mode, PREPARE_SEC), [chosen, mode]);
  const total = totalSeconds(phases);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: "color-mix(in srgb, #201e1d 45%, transparent)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="interval-timer-setup-title"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto p-4.5"
        style={{
          background: "var(--dc-surface)",
          borderRadius: "14px 14px 0 0",
          boxShadow: "var(--dc-shadow-lg)",
          paddingBottom: "max(26px, calc(env(safe-area-inset-bottom) + 12px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id="interval-timer-setup-title" className="text-[18px] font-semibold">
              Intervall-Timer
            </div>
            <p className="mt-1 text-[13px]" style={{ color: "var(--dc-muted)" }}>
              Übungen auswählen. Zeiten, Pausen und Runden kommen aus dem Plan.
            </p>
          </div>
          <button type="button" className="btn btn-ghost flex-none" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="seg mt-4 w-full" role="radiogroup" aria-label="Ablauf">
          <label className="seg-opt flex-1 justify-center">
            <input type="radio" name="interval-timer-mode" checked={mode === "circuit"} onChange={() => setMode("circuit")} />
            Zirkel
          </label>
          <label className="seg-opt flex-1 justify-center">
            <input type="radio" name="interval-timer-mode" checked={mode === "sequence"} onChange={() => setMode("sequence")} />
            Nacheinander
          </label>
        </div>
        <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
          {mode === "circuit"
            ? "Jede Runde läuft einmal durch alle Stationen."
            : "Jede Übung läuft alle ihre Runden, dann kommt die nächste."}
        </p>

        <ul className="mt-3.5 flex flex-col gap-1.5">
          {items.map((item) => {
            const on = selected.has(item.id);
            return (
              <li key={item.id}>
                <label
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                  style={{
                    border: `1px solid ${on ? "var(--dc-accent)" : "var(--dc-divider)"}`,
                    background: on ? "color-mix(in srgb, var(--dc-accent) 8%, var(--dc-surface))" : "transparent",
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(item.id)} className="h-5 w-5 flex-none" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-tight">{item.name}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--dc-muted)" }}>
                      {item.perSide ? `${formatClock(item.workSec)} je Seite` : formatClock(item.workSec)}
                      {item.restSec ? ` · Pause ${formatClock(item.restSec)}` : ""}
                      {` · ${item.rounds} ${item.rounds === 1 ? "Runde" : "Runden"}`}
                      {item.roundRestSec ? ` · Rundenpause ${formatClock(item.roundRestSec)}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="btn btn-ghost btn-block mt-3"
          onClick={() => {
            const audio = startAudio();
            if (audio.ctx) SOUNDS.work(audio.ctx);
            window.setTimeout(audio.release, 1500);
          }}
        >
          <span aria-hidden>🔊</span> Ton testen
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block mt-2"
          disabled={chosen.length === 0}
          onClick={() => onStart(phases)}
        >
          {chosen.length === 0 ? "Mindestens eine Übung auswählen" : `Starten · ${formatClock(total)} Min.`}
        </button>
      </div>
    </div>
  );
}

// ---------- full-screen runner ----------

type WakeLockSentinelLike = { release: () => Promise<void> };

function phaseTitle(phase: TimerPhase): string {
  if (phase.kind === "prepare") return "Gleich geht's los";
  if (phase.kind === "rest") return phase.roundRest ? "Rundenpause" : "Pause";
  return "Arbeit";
}

function TimerRunner({ phases, audio, onClose }: { phases: TimerPhase[]; audio: AudioContext | null; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  // The phase ends at an absolute time, so the countdown stays exact even if
  // the device stalls; while paused, the remaining milliseconds are kept.
  const [endsAt, setEndsAt] = useState(() => Date.now() + phases[0].seconds * 1000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPref);

  const lastTickRef = useRef<string>("");
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const play = useCallback(
    (sound: keyof typeof SOUNDS) => {
      if (!audio || !soundOnRef.current) return;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      SOUNDS[sound](audio);
    },
    [audio]
  );

  const enterPhase = useCallback(
    (next: number, from: TimerPhase | undefined) => {
      const phase = phases[next];
      if (phase.kind === "work") {
        play(from?.kind === "work" && from.name === phase.name && from.side !== phase.side ? "side" : "work");
      } else if (phase.kind === "rest") {
        play("rest");
      }
    },
    [phases, play]
  );

  // Ticking: advance through every phase whose end has passed (more than
  // one if the tab was in the background), then beep 3-2-1 before the end.
  useEffect(() => {
    if (finished || pausedLeft !== null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      let i = index;
      let end = endsAt;
      while (t >= end) {
        if (i >= phases.length - 1) {
          setFinished(true);
          play("done");
          return;
        }
        const from = phases[i];
        i += 1;
        end += phases[i].seconds * 1000;
        enterPhase(i, from);
      }
      if (i !== index) {
        setIndex(i);
        setEndsAt(end);
        return;
      }
      const left = Math.ceil((end - t) / 1000);
      const key = `${i}:${left}`;
      if (left >= 1 && left <= 3 && lastTickRef.current !== key && phases[i].seconds > 3) {
        lastTickRef.current = key;
        play("tick");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [index, endsAt, pausedLeft, finished, phases, play, enterPhase]);

  // Keep the screen on while the timer is open.
  useEffect(() => {
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };
    const acquire = () => {
      if (!nav.wakeLock || document.visibilityState !== "visible") return;
      nav.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) void l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, []);

  const jumpTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(phases.length - 1, next));
      const t = Date.now();
      setFinished(false);
      setIndex(clamped);
      setNow(t);
      if (pausedLeft !== null) setPausedLeft(phases[clamped].seconds * 1000);
      else {
        setEndsAt(t + phases[clamped].seconds * 1000);
        enterPhase(clamped, undefined);
      }
    },
    [phases, pausedLeft, enterPhase]
  );

  const togglePause = useCallback(() => {
    const t = Date.now();
    if (pausedLeft === null) {
      setPausedLeft(Math.max(0, endsAt - t));
    } else {
      setEndsAt(t + pausedLeft);
      setNow(t);
      setPausedLeft(null);
    }
  }, [pausedLeft, endsAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !finished) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause, finished]);

  const phase = phases[index];
  const leftMs = pausedLeft ?? Math.max(0, endsAt - now);
  const leftSec = Math.ceil(leftMs / 1000);
  const progress = phase.seconds > 0 ? 1 - leftMs / (phase.seconds * 1000) : 1;
  const remainingTotal = leftSec + phases.slice(index + 1).reduce((s, p) => s + p.seconds, 0);

  const palette =
    finished || phase.kind === "rest"
      ? { bg: "var(--dc-surface)", fg: "var(--dc-text)", muted: "var(--dc-muted)", bar: "var(--dc-accent)" }
      : phase.kind === "work"
        ? // Fixed dark shades (not the theme tokens, which turn light in dark
        // mode) so white digits stay readable across the hall in both themes.
        { bg: "#006a8a", fg: "#fff", muted: "rgba(255,255,255,0.82)", bar: "#fff" }
        : { bg: "#a3124f", fg: "#fff", muted: "rgba(255,255,255,0.85)", bar: "#fff" };

  const ctrlStyle = { border: `1px solid ${palette.muted}`, color: palette.fg, background: "transparent" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Intervall-Timer"
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        background: palette.bg,
        color: palette.fg,
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(18px, env(safe-area-inset-bottom))",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
        paddingRight: "max(16px, env(safe-area-inset-right))",
        transition: "background-color 200ms",
      }}
    >
      <div className="flex items-center justify-between gap-3 text-[14px]" style={{ color: palette.muted }}>
        <span className="tabular-nums">
          {finished
            ? "Fertig"
            : `Runde ${phase.round}/${phase.rounds} · Station ${phase.station}/${phase.stations} · noch ${formatClock(remainingTotal)}`}
        </span>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            className="btn"
            style={ctrlStyle}
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              writeSoundPref(next);
            }}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Ton ausschalten" : "Ton einschalten"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button type="button" className="btn" style={ctrlStyle} onClick={onClose}>
            Beenden
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        {finished ? (
          <>
            <div className="text-[clamp(40px,10vw,88px)] font-semibold leading-none">Geschafft!</div>
            <button type="button" className="btn btn-primary mt-8 px-8" onClick={onClose}>
              Schließen
            </button>
          </>
        ) : (
          <>
            <div className="text-[clamp(16px,3.2vw,28px)] font-semibold uppercase tracking-[0.12em]" aria-live="polite">
              {pausedLeft !== null ? "Angehalten" : phaseTitle(phase)}
            </div>
            <div className="mt-2 max-w-full text-[clamp(24px,6vw,56px)] leading-[1.1]">
              {phase.kind === "rest" && phase.next ? `Als Nächstes: ${phase.next}` : phase.name}
            </div>
            {phase.side && (phase.kind === "work" || phase.kind === "prepare") && (
              <div
                className="mt-3 rounded-full px-5 py-1.5 text-[clamp(16px,3.5vw,30px)] font-semibold uppercase"
                style={{ border: `2px solid ${palette.fg}` }}
              >
                {phase.side}
              </div>
            )}
            <div
              role="timer"
              aria-live="off"
              className="mt-2 font-semibold leading-none tabular-nums"
              style={{ fontSize: "min(34vw, 38dvh)" }}
            >
              {formatClock(leftSec)}
            </div>
            {phase.kind === "work" && phase.next && (
              <div className="mt-2 text-[clamp(14px,2.6vw,22px)]" style={{ color: palette.muted }}>
                Als Nächstes: {phase.next}
              </div>
            )}
          </>
        )}
      </div>

      {!finished && (
        <>
          <div className="h-[6px] w-full" style={{ background: "color-mix(in srgb, currentColor 20%, transparent)" }}>
            <div className="h-[6px]" style={{ background: palette.bar, width: `${Math.min(100, progress * 100)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button type="button" className="btn py-4" style={ctrlStyle} onClick={() => jumpTo(index - 1)} disabled={index === 0}>
              ◀ Zurück
            </button>
            <button
              type="button"
              className="btn py-4 text-[17px] font-semibold"
              style={{ ...ctrlStyle, background: palette.fg, color: palette.bg, border: "none" }}
              onClick={togglePause}
            >
              {pausedLeft !== null ? "▶ Weiter" : "❚❚ Pause"}
            </button>
            <button type="button" className="btn py-4" style={ctrlStyle} onClick={() => jumpTo(index + 1)} disabled={index >= phases.length - 1}>
              Vor ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}
