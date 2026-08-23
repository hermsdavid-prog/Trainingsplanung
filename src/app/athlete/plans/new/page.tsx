import { createClient } from "@/lib/supabase/server";
import { OwnPlanFlow } from "@/components/plans/own-plan-flow";
import type { PlanTemplateSummary } from "@/components/plans/new-plan-flow";

export default async function NewOwnPlanPage() {
  const supabase = await createClient();

  // No category filter (unlike the trainer's NewPlanPage) — the athlete
  // hasn't chosen Athletik vs. Sportartspezifisch yet at this point, that
  // happens in step 2. RLS (plan_templates_select) already restricts this
  // plain select to templates scoped to groups the athlete belongs to.
  const { data: templateRows } = await supabase
    .from("plan_templates")
    .select("id, title, usage_note, items, category_label")
    .order("created_at");

  const templates: PlanTemplateSummary[] = (templateRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    usage_note: t.usage_note,
    itemCount: Array.isArray(t.items) ? t.items.length : 0,
    category_label: t.category_label,
  }));

  return (
    <div className="max-w-[520px]">
      <OwnPlanFlow templates={templates} />
    </div>
  );
}
