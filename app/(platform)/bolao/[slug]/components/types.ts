import type { BolaoMatch, BolaoTeam } from "@/lib/types/bolao";

export type MatchWithTeams = BolaoMatch & {
  home_team: Pick<BolaoTeam, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<BolaoTeam, "id" | "name" | "short_name" | "logo_url"> | null;
};
