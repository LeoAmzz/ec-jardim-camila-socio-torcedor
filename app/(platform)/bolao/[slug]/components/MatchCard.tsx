import { Badge } from "@/components/shared/Badge";
import type { BolaoCompetition, BolaoPrediction } from "@/lib/types/bolao";
import { TeamLogo } from "./TeamLogo";
import type { MatchWithTeams } from "./types";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: MatchWithTeams;
  competition: BolaoCompetition | null;
  prediction?: BolaoPrediction;
  draft: { home: string; away: string };
  savingMatchId: string | null;
  onUpdateScore: (matchId: string, team: "home" | "away", value: string) => void;
  onSavePrediction: (match: MatchWithTeams) => void;
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date)).toUpperCase();
}

function getMatchBadge(match: MatchWithTeams) {
  const deadlinePassed = new Date(match.prediction_deadline).getTime() <= Date.now();

  if (match.status === "finished") {
    return <Badge variant="green">FINALIZADO</Badge>;
  }

  if (deadlinePassed || match.status === "locked") {
    return <Badge variant="gray">ENCERRADO</Badge>;
  }

  return <Badge variant="yellow">ABERTO</Badge>;
}

export function MatchCard({ match, competition, prediction, draft, savingMatchId, onUpdateScore, onSavePrediction }: MatchCardProps) {
  const deadlinePassed = new Date(match.prediction_deadline).getTime() <= Date.now();
  const canEdit = competition?.status === "open" && !deadlinePassed && (match.status === "scheduled" || match.status === "open");
  const homeName = match.home_team?.short_name || match.home_team?.name || "Mandante";
  const awayName = match.away_team?.short_name || match.away_team?.name || "Visitante";

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-lg overflow-hidden transition-all hover:border-primary/30">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-sidebar/50 px-4 py-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground md:text-xs">
          {formatDateTime(match.match_datetime)}
          {(match.phase || match.round_label) && <> • {[match.phase, match.round_label].filter(Boolean).join(" • ")}</>}
        </span>
        {getMatchBadge(match)}
      </div>

      <div className="flex-1 p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.home_team} tone="home" />
            <span className="text-center text-[11px] font-black uppercase leading-tight tracking-wide text-foreground md:text-sm break-words">
              {homeName}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {match.status === "finished" ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-2 shadow-inner">
                <span className="text-2xl font-black text-foreground">{match.home_score ?? "-"}</span>
                <span className="text-sm font-black text-muted-foreground">X</span>
                <span className="text-2xl font-black text-foreground">{match.away_score ?? "-"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/50 p-2 shadow-inner">
                <input
                  type="number"
                  min={0}
                  value={draft.home}
                  disabled={!canEdit}
                  onChange={(event) => onUpdateScore(match.id, "home", event.target.value)}
                  className="h-12 w-12 rounded-xl border border-border bg-card text-center text-xl font-black text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm font-black text-muted-foreground">X</span>
                <input
                  type="number"
                  min={0}
                  value={draft.away}
                  disabled={!canEdit}
                  onChange={(event) => onUpdateScore(match.id, "away", event.target.value)}
                  className="h-12 w-12 rounded-xl border border-border bg-card text-center text-xl font-black text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.away_team} tone="away" />
            <span className="text-center text-[11px] font-black uppercase leading-tight tracking-wide text-foreground md:text-sm break-words">
              {awayName}
            </span>
          </div>
        </div>

        {match.status === "finished" && (
          <div className="mt-5 rounded-xl border border-border bg-background/70 p-4 text-center shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pontuação obtida</p>
            {prediction ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/50 bg-card p-2 shadow-sm">
                  <p className="text-lg font-black text-foreground">{prediction.points_winner}</p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">V/E</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-2 shadow-sm">
                  <p className="text-lg font-black text-foreground">{prediction.points_exact_score}</p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Exato</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-primary/10 p-2 shadow-sm">
                  <p className="text-lg font-black text-primary">{prediction.points_total}</p>
                  <p className="text-[10px] font-bold uppercase text-primary">Total</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm font-bold text-muted-foreground">Sem palpite</p>
            )}
          </div>
        )}

        {!canEdit && match.status !== "finished" && (
          <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {competition?.status === "open" ? "Palpites encerrados" : "Bolão fechado"}
          </p>
        )}

        {prediction && match.status !== "finished" && (
          <p className="mt-4 text-center text-xs font-black uppercase tracking-wider text-green-500">
            Palpite salvo
          </p>
        )}
      </div>

      {match.status !== "finished" && (
        <div className="border-t border-border bg-card/50 p-4">
          <button
            type="button"
            onClick={() => onSavePrediction(match)}
            disabled={!canEdit || savingMatchId === match.id}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all",
              savingMatchId === match.id
                ? "bg-primary/70 cursor-not-allowed"
                : "bg-primary hover:bg-primary-light hover:shadow-lg disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            )}
          >
            {savingMatchId === match.id ? "SALVANDO..." : prediction ? "ATUALIZAR PALPITE" : "SALVAR PALPITE"}
          </button>
        </div>
      )}
    </div>
  );
}
