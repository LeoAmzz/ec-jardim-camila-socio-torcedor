export type PlanType = "torcedor" | "camisa" | "campeao";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  plan_type: PlanType;
  created_at: string;
  updated_at: string;
}
