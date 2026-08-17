export const PLAN_TYPES = ["Sportartspezifisch", "Athletik"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export function isValidPlanType(value: string): value is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(value);
}
