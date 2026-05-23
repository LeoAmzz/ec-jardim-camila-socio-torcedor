import type { PaidPlanType, PlanConfig, PlanType } from "@/lib/types/membership";

export const plans: PlanConfig[] = [
  {
    type: "torcedor",
    name: "Torcedor",
    price: 0,
    free: true,
  },
  {
    type: "camisa",
    name: "Camisa",
    price: 15,
    recurring: true,
  },
  {
    type: "campeao",
    name: "Campeão",
    price: 39.9,
    recurring: true,
  },
];

export function getPlanByType(planType: PlanType) {
  return plans.find((plan) => plan.type === planType);
}

export function isPaidPlan(planType: PlanType): planType is PaidPlanType {
  return planType === "camisa" || planType === "campeao";
}

export function canAccessExclusive(planType: PlanType) {
  return isPaidPlan(planType);
}
