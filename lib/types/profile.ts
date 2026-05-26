export type PlanType = "torcedor" | "camisa" | "campeao";
export type ProfileRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  plan_type: PlanType;
  role?: ProfileRole;
  created_at: string;
  updated_at: string;
}
