export type EarnedBadge = {
  key: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
};

export function BadgesList({ badges }: { badges: EarnedBadge[] }) {
  if (badges.length === 0) {
    return <p className="mt-3 text-sm text-muted">Noch keine Erfolge freigeschaltet.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2.5">
      {badges.map((b) => (
        <div
          key={b.key}
          className="flex items-start gap-2.5 p-3"
          style={{ background: "var(--dc-surface)", minWidth: 220, maxWidth: 280 }}
        >
          <span className="text-[22px] leading-none">{b.icon}</span>
          <div className="min-w-0">
            <div className="text-[14px] leading-[1.3]">{b.title}</div>
            <p className="mt-0.5 text-xs leading-[1.4] text-muted">{b.description}</p>
            <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}>
              {new Date(b.earnedAt).toLocaleDateString("de-DE")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
