import Link from "next/link";

// Shared List/Kalender switch for both the trainer's and the athlete's
// Mesozyklen pages — Kalender is the default landing view on both.
// hrefBase carries every other active filter (if any) with no trailing
// separator, e.g. "/trainer/mesocycles?group=x" or plain "/athlete/mesocycles".
export function MesocycleViewToggle({ hrefBase, view }: { hrefBase: string; view: "list" | "calendar" }) {
  const sep = hrefBase.includes("?") ? "&" : "?";
  return (
    <div className="flex gap-1">
      <Link
        href={`${hrefBase}${sep}view=list`}
        className="chip"
        style={view === "list" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
      >
        Liste
      </Link>
      <Link
        href={`${hrefBase}${sep}view=calendar`}
        className="chip"
        style={view === "calendar" ? { background: "var(--dc-accent)", color: "var(--dc-bg)" } : undefined}
      >
        Kalender
      </Link>
    </div>
  );
}
