"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EXERCISE_ANIMATIONS,
  cycleBounds,
  drawList,
  poseAt,
  solve,
  type Draw,
  type ExerciseAnimation as Anim,
} from "@/lib/exercise-animations";

const STROKE: Record<string, string> = {
  body: "var(--dc-text)",
  far: "var(--dc-text)",
  equip: "var(--dc-accent)",
  ground: "color-mix(in srgb, var(--dc-text) 30%, transparent)",
  guide: "var(--dc-accent-2)",
};

function Shape({ d }: { d: Draw }) {
  const stroke = STROKE[d.tone];
  if (d.kind === "poly") {
    return (
      <polyline
        points={d.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={stroke}
        strokeOpacity={d.tone === "far" ? 0.28 : 1}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (d.kind === "line") {
    return <line x1={d.a.x} y1={d.a.y} x2={d.b.x} y2={d.b.y} stroke={stroke} strokeWidth={d.width ?? 3} strokeLinecap="round" />;
  }
  if (d.kind === "circle") {
    return (
      <circle
        cx={d.c.x}
        cy={d.c.y}
        r={d.r}
        fill={d.fill ? stroke : "color-mix(in srgb, var(--dc-accent) 10%, transparent)"}
        stroke={d.fill ? "none" : stroke}
        strokeWidth={3}
      />
    );
  }
  return <rect x={d.x} y={d.y} width={d.w} height={d.h} fill="none" stroke={stroke} strokeWidth={3} />;
}

// Loops the exercise's movement as a small line drawing. With reduced motion
// it shows the key position (the second frame) as a still image instead.
export function ExerciseAnimation({ animation, className }: { animation: string; className?: string }) {
  const anim: Anim | undefined = EXERCISE_ANIMATIONS[animation];
  const [t, setT] = useState(0);
  // Only ever rendered client-side (inside dialogs opened on tap), so the
  // media query can be read during the first render.
  const [still] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!anim || still) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, still]);

  const box = useMemo(() => {
    if (!anim) return null;
    const b = cycleBounds(anim);
    const pad = 10;
    return { x: b.minX - pad, y: b.minY - pad, w: b.maxX - b.minX + 2 * pad, h: b.maxY - b.minY + 2 * pad };
  }, [anim]);

  if (!anim || !box) return null;
  const pose = still ? anim.frames[Math.min(1, anim.frames.length - 1)] : poseAt(anim, t);
  const shapes = drawList(anim, solve(anim, pose));

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className={className}
      role="img"
      aria-label={`Bewegungsablauf: ${anim.label}`}
      style={{ display: "block", width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      {shapes.map((d, i) => (
        <Shape key={i} d={d} />
      ))}
    </svg>
  );
}

export function hasExerciseAnimation(key: string | null | undefined): key is string {
  return !!key && key in EXERCISE_ANIMATIONS;
}
