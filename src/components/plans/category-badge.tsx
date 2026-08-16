import { Badge } from "@/components/ui/badge";
import { getCategoryBadgeClass } from "@/lib/category-color";

export function CategoryBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className={getCategoryBadgeClass(label)}>
      {label}
    </Badge>
  );
}
