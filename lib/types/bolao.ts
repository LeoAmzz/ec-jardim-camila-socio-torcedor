export type BolaoCompetitionStatus = "draft" | "open" | "closed" | "finished" | "archived";
export type BolaoMatchStatus = "scheduled" | "open" | "locked" | "finished" | "cancelled";
export type BolaoPrizeRankingType = "general" | "subscribers";

export interface BolaoCompetition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BolaoCompetitionStatus;
  starts_at: string | null;
  ends_at: string | null;
  points_winner: number;
  points_exact_score: number;
  subscribers_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface BolaoTeam {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BolaoMatch {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  phase: string | null;
  round_label: string | null;
  match_datetime: string;
  prediction_deadline: string;
  status: BolaoMatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface BolaoPrediction {
  id: string;
  competition_id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points_winner: number;
  points_exact_score: number;
  points_total: number;
  calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BolaoPrize {
  id: string;
  competition_id: string;
  ranking_type: BolaoPrizeRankingType;
  position: number;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface BolaoRankingRow {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  plan_type: string | null;
  points_total: number;
  winner_hits: number;
  exact_score_hits: number;
  predictions_count: number;
  first_prediction_at: string | null;
  position: number;
}
