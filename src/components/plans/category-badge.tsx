export function CategoryBadge({ label }: { label: string }) {
  const isAthletik = label.trim().toLowerCase() === "athletik";
  return (
    <span className={`tag ${isAthletik ? "tag-accent" : "tag-accent-2"}`}>{label}</span>
  );
}
