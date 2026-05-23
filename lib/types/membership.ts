export type PlanType = "torcedor" | "camisa" | "campeao";

export type PaidPlanType = Exclude<PlanType, "torcedor">;

export interface PlanConfig {
  type: PlanType;
  name: string;
  price: number;
  free?: boolean;
  recurring?: boolean;
}
