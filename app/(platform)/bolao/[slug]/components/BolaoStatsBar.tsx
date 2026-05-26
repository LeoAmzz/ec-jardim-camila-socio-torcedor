import { Badge } from "@/components/shared/Badge";
import type { BolaoCompetition } from "@/lib/types/bolao";

interface BolaoStatsBarProps {
  competition: BolaoCompetition;
  userPointsTotal: number;
  userWinnerHits: number;
  userExactScoreHits: number;
}

export function BolaoStatsBar({ competition, userPointsTotal, userWinnerHits, userExactScoreHits }: BolaoStatsBarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Competição</p>
          <h2 className="text-xl font-black text-foreground">{competition.name}</h2>
        </div>
        <Badge variant={competition.subscribers_only ? "yellow" : "green"}>
          {competition.subscribers_only ? "Sócios" : "Aberto"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-background/50 text-center md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="py-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Seus Pontos</p>
          <p className="text-3xl font-black text-accent md:text-4xl">{userPointsTotal}</p>
        </div>
        <div className="py-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Acertos V/E</p>
          <p className="text-2xl font-black text-foreground md:text-3xl">{userWinnerHits}</p>
        </div>
        <div className="py-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Placares exatos</p>
          <p className="text-2xl font-black text-foreground md:text-3xl">{userExactScoreHits}</p>
        </div>
      </div>
    </div>
  );
}
