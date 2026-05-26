"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/shared/Badge";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { BolaoCompetition, BolaoMatch, BolaoPrediction, BolaoPrize, BolaoRankingRow, BolaoTeam } from "@/lib/types/bolao";
import { Info, Medal, ShieldCheck, Trophy } from "lucide-react";

type Tab = "palpitar" | "ranking_assinantes" | "ranking_geral";
type ScoreDraft = { home: string; away: string };
type MatchWithTeams = BolaoMatch & {
  home_team: Pick<BolaoTeam, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<BolaoTeam, "id" | "name" | "short_name" | "logo_url"> | null;
};

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

function TeamLogo({ team, tone }: { team: MatchWithTeams["home_team"]; tone: "home" | "away" }) {
  const teamName = team?.short_name || team?.name || "Time";

  if (team?.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={`Logo de ${teamName}`}
        className="h-14 w-14 rounded-full border-2 border-background bg-card object-contain p-1 shadow-md md:h-16 md:w-16"
      />
    );
  }

  return (
    <div className={cn(
      "flex h-14 w-14 items-center justify-center rounded-full border-2 border-background shadow-md md:h-16 md:w-16",
      tone === "home" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
    )}>
      <ShieldCheck size={28} />
    </div>
  );
}

function getInitials(row: BolaoRankingRow) {
  const name = row.full_name || row.username || "Torcedor";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function RankingAvatar({ row, featured = false }: { row: BolaoRankingRow; featured?: boolean }) {
  const sizeClass = featured ? "h-16 w-16 text-lg" : "h-10 w-10 text-xs";

  if (row.avatar_url) {
    return (
      <img
        src={row.avatar_url}
        alt={`Avatar de ${row.full_name || row.username || "torcedor"}`}
        className={cn(sizeClass, "rounded-full border-2 border-background bg-card object-cover shadow-md")}
      />
    );
  }

  return (
    <div className={cn(sizeClass, "flex items-center justify-center rounded-full border-2 border-background bg-primary font-black text-white shadow-md")}>
      {getInitials(row)}
    </div>
  );
}

export default function BolaoDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("palpitar");
  const [competition, setCompetition] = useState<BolaoCompetition | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [predictionsByMatch, setPredictionsByMatch] = useState<Record<string, BolaoPrediction>>({});
  const [scores, setScores] = useState<Record<string, ScoreDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [generalRanking, setGeneralRanking] = useState<BolaoRankingRow[]>([]);
  const [subscribersRanking, setSubscribersRanking] = useState<BolaoRankingRow[]>([]);
  const [prizes, setPrizes] = useState<BolaoPrize[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);

  const loadBolao = useCallback(async () => {
    if (!user?.id || !slug) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data: selectedCompetition, error: competitionError } = await supabase
      .from("bolao_competitions")
      .select("*")
      .eq("slug", slug)
      .neq("status", "archived")
      .maybeSingle<BolaoCompetition>();

    if (competitionError) {
      setCompetition(null);
      setMatches([]);
      setPredictionsByMatch({});
      setMessage("Não foi possível carregar este bolão agora.");
      setLoading(false);
      return;
    }

    if (!selectedCompetition) {
      setCompetition(null);
      setMatches([]);
      setPredictionsByMatch({});
      setLoading(false);
      return;
    }

    setCompetition(selectedCompetition);

    const { data: matchRows, error: matchesError } = await supabase
      .from("bolao_matches")
      .select(`
        *,
        home_team:bolao_teams!bolao_matches_home_team_id_fkey(id,name,short_name,logo_url),
        away_team:bolao_teams!bolao_matches_away_team_id_fkey(id,name,short_name,logo_url)
      `)
      .eq("competition_id", selectedCompetition.id)
      .order("match_datetime", { ascending: true })
      .returns<MatchWithTeams[]>();

    if (matchesError) {
      setMatches([]);
      setPredictionsByMatch({});
      setMessage("Não foi possível carregar os jogos do bolão agora.");
      setLoading(false);
      return;
    }

    const { data: predictionRows, error: predictionsError } = await supabase
      .from("bolao_predictions")
      .select("*")
      .eq("competition_id", selectedCompetition.id)
      .eq("user_id", user.id)
      .returns<BolaoPrediction[]>();

    if (predictionsError) {
      setPredictionsByMatch({});
      setMessage("Não foi possível carregar seus palpites agora.");
    }

    const { data: prizeRows, error: prizesError } = await supabase
      .from("bolao_prizes")
      .select("*")
      .eq("competition_id", selectedCompetition.id)
      .order("ranking_type", { ascending: true })
      .order("position", { ascending: true })
      .returns<BolaoPrize[]>();

    if (prizesError) {
      setPrizes([]);
    } else {
      setPrizes(prizeRows || []);
    }

    const nextPredictions = (predictionRows || []).reduce<Record<string, BolaoPrediction>>((acc, prediction) => {
      acc[prediction.match_id] = prediction;
      return acc;
    }, {});
    const nextScores = (matchRows || []).reduce<Record<string, ScoreDraft>>((acc, match) => {
      const prediction = nextPredictions[match.id];
      acc[match.id] = {
        home: prediction ? String(prediction.home_score) : "0",
        away: prediction ? String(prediction.away_score) : "0",
      };
      return acc;
    }, {});

    setMatches(matchRows || []);
    setPredictionsByMatch(nextPredictions);
    setScores(nextScores);
    setLoading(false);
  }, [slug, user?.id]);

  useEffect(() => {
    void loadBolao();
  }, [loadBolao]);

  const loadRanking = useCallback(async (subscribersOnly: boolean) => {
    if (!competition?.id) {
      return;
    }

    setRankingLoading(true);
    setRankingError(null);

    const { data, error } = await supabase.rpc("get_bolao_ranking", {
      p_competition_id: competition.id,
      p_subscribers_only: subscribersOnly,
    });

    if (error) {
      setRankingError("Não foi possível carregar o ranking agora.");
      setRankingLoading(false);
      return;
    }

    if (subscribersOnly) {
      setSubscribersRanking((data || []) as BolaoRankingRow[]);
    } else {
      setGeneralRanking((data || []) as BolaoRankingRow[]);
    }

    setRankingLoading(false);
  }, [competition?.id]);

  useEffect(() => {
    if (activeTab === "ranking_geral") {
      void loadRanking(false);
    }

    if (activeTab === "ranking_assinantes") {
      void loadRanking(true);
    }
  }, [activeTab, loadRanking]);

  function updateScore(matchId: string, team: "home" | "away", value: string) {
    const parsedValue = value === "" ? "" : String(Math.max(0, Number(value)));

    setScores((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "0",
        away: current[matchId]?.away ?? "0",
        [team]: parsedValue,
      },
    }));
  }

  async function savePrediction(match: MatchWithTeams) {
    if (!user?.id || !competition) {
      setMessage("Faça login para salvar seu palpite.");
      return;
    }

    if (competition.status !== "open") {
      setMessage("Este bolão não está aberto para palpites.");
      return;
    }

    const draft = scores[match.id];

    if (!draft || draft.home === "" || draft.away === "") {
      setMessage("Informe os dois placares.");
      return;
    }

    const homeScore = Number(draft.home);
    const awayScore = Number(draft.away);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setMessage("Informe placares válidos.");
      return;
    }

    if (new Date(match.prediction_deadline).getTime() <= Date.now()) {
      setMessage("O prazo para palpitar neste jogo já encerrou.");
      return;
    }

    if (match.status !== "scheduled" && match.status !== "open") {
      setMessage("O prazo para palpitar neste jogo já encerrou.");
      return;
    }

    setSavingMatchId(match.id);
    setMessage(null);

    const { data, error } = await supabase
      .from("bolao_predictions")
      .upsert(
        {
          competition_id: competition.id,
          match_id: match.id,
          user_id: user.id,
          home_score: homeScore,
          away_score: awayScore,
        },
        { onConflict: "match_id,user_id" }
      )
      .select("*")
      .single<BolaoPrediction>();

    setSavingMatchId(null);

    if (error || !data) {
      setMessage("Não foi possível salvar seu palpite agora.");
      return;
    }

    setPredictionsByMatch((current) => ({
      ...current,
      [match.id]: data,
    }));
    setMessage("Palpite salvo com sucesso.");
  }

  const userPredictions = Object.values(predictionsByMatch);
  const userPointsTotal = userPredictions.reduce((total, prediction) => total + prediction.points_total, 0);
  const userWinnerHits = userPredictions.filter((prediction) => prediction.points_winner > 0).length;
  const userExactScoreHits = userPredictions.filter((prediction) => prediction.points_exact_score > 0).length;

  function getPlanLabel(planType: string | null) {
    if (planType === "campeao") {
      return "Campeão";
    }

    if (planType === "camisa") {
      return "Camisa";
    }

    return "Torcedor";
  }

  function renderPrizeList(rankingType: BolaoPrize["ranking_type"], title: string) {
    const filteredPrizes = prizes.filter((prize) => prize.ranking_type === rankingType);

    if (filteredPrizes.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">{title}</p>
        {filteredPrizes.map((prize) => (
          <div key={prize.id} className="flex gap-3 rounded-xl border border-border bg-background/60 p-3">
            {prize.image_url ? (
              <img src={prize.image_url} alt={prize.title} className="h-14 w-14 rounded-lg border border-border object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-accent">
                <Trophy size={24} />
              </div>
            )}
            <div>
              <p className="text-sm font-black text-foreground">{prize.position}º lugar • {prize.title}</p>
              {prize.description && <p className="mt-1 text-xs text-muted-foreground">{prize.description}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderPrizes() {
    return (
      <aside className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Trophy size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Premiação</p>
            <h3 className="text-lg font-black text-foreground">Prêmios do Bolão</h3>
          </div>
        </div>

        {prizes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            Premiação será divulgada em breve.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {renderPrizeList("general", "Ranking Geral")}
            {renderPrizeList("subscribers", "Ranking Assinantes")}
          </div>
        )}
      </aside>
    );
  }

  function renderTopCard(row: BolaoRankingRow, index: number) {
    const medalStyles = [
      "border-accent/60 bg-accent/10",
      "border-slate-300/40 bg-slate-300/10",
      "border-orange-400/50 bg-orange-400/10",
    ];

    return (
      <div key={row.user_id} className={cn("relative overflow-hidden rounded-2xl border p-5", medalStyles[index] || "border-border bg-card")}>
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <RankingAvatar row={row} featured />
            <div>
              <div className="flex items-center gap-2">
                <Medal size={18} className="text-accent" />
                <span className="text-xs font-black uppercase tracking-wider text-accent">{row.position}º lugar</span>
              </div>
              <p className="mt-1 text-lg font-black text-foreground">{row.full_name || row.username || "Torcedor"}</p>
              {row.username && <p className="text-xs text-muted-foreground">@{row.username}</p>}
            </div>
          </div>
          <Badge variant={row.plan_type === "torcedor" ? "gray" : "yellow"}>{getPlanLabel(row.plan_type)}</Badge>
        </div>

        <div className="relative mt-5">
          <p className="text-4xl font-black text-accent">{row.points_total}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">pontos</p>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-background/70 p-2">
            <p className="text-lg font-black text-foreground">{row.winner_hits}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">V/E</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-2">
            <p className="text-lg font-black text-foreground">{row.exact_score_hits}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Exatos</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-2">
            <p className="text-lg font-black text-foreground">{row.predictions_count}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Palpites</p>
          </div>
        </div>
      </div>
    );
  }

  function renderRanking(rows: BolaoRankingRow[], emptyMessage: string) {
    if (!competition) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          Bolão não encontrado.
        </div>
      );
    }

    if (rankingLoading) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Carregando ranking...
        </div>
      );
    }

    if (rankingError) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 text-sm font-semibold text-danger">
          {rankingError}
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    const topRows = rows.slice(0, 3);
    const remainingRows = rows.slice(3);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {topRows.map((row, index) => renderTopCard(row, index))}
        </div>

        {remainingRows.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground bg-opacity-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                  <th className="px-4 py-3 font-medium">Torcedor</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell text-center">Plano</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell text-center">V/E</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell text-center">Exatos</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell text-center">Palpites</th>
                  <th className="px-4 py-3 font-black text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {remainingRows.map((row) => (
                  <tr key={row.user_id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 text-muted-foreground font-bold text-center">{row.position}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <RankingAvatar row={row} />
                        <div>
                          <p className="font-bold text-foreground">{row.full_name || row.username || "Torcedor"}</p>
                          {row.username && <p className="text-xs text-muted-foreground">@{row.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-center">
                      <Badge variant={row.plan_type === "torcedor" ? "gray" : "yellow"}>{getPlanLabel(row.plan_type)}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground hidden md:table-cell text-center">{row.winner_hits}</td>
                    <td className="px-4 py-4 text-muted-foreground hidden md:table-cell text-center">{row.exact_score_hits}</td>
                    <td className="px-4 py-4 text-muted-foreground hidden lg:table-cell text-center">{row.predictions_count}</td>
                    <td className="px-4 py-4 font-black text-accent text-right text-base">{row.points_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (!loading && !competition) {
    return (
      <div className="space-y-4">
        <Link href="/bolao" className="text-sm font-semibold text-accent hover:text-accent-dark">Voltar para bolões</Link>
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">Bolão não encontrado.</div>
      </div>
    );
  }

  const isDraftForUser = competition?.status === "draft" && profile?.role !== "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-3">
        <div>
          <Link href="/bolao" className="text-xs font-semibold text-accent hover:text-accent-dark">Voltar para bolões</Link>
          <h1 className="mt-2 text-2xl font-black text-foreground">{competition?.name || "Bolão"}</h1>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === "admin" && (
            <Link href="/bolao/admin" className="text-xs font-semibold text-accent hover:text-accent-dark">Admin do Bolão</Link>
          )}
          <button
            type="button"
            onClick={() => setShowRules((current) => !current)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-semibold"
          >
            <Info size={14} /> Regras
          </button>
        </div>
      </div>

      {isDraftForUser && (
        <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
          Este bolão ainda não está aberto.
        </div>
      )}

      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-border pb-1">
        {(["palpitar", "ranking_assinantes", "ranking_geral"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === tab ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            {tab === "palpitar" ? "PALPITAR" : tab === "ranking_assinantes" ? "RANKING ASSINANTES" : "RANKING GERAL"}
            {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
        ))}
      </div>

      {showRules && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Info size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Regulamento</p>
              <p className="text-lg font-black text-foreground">Como pontuar no Bolão</p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-2xl font-black text-accent">{competition?.points_winner || 3}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">pontos</p>
              <p className="mt-2 text-foreground">Acertar vencedor ou empate.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-2xl font-black text-accent">+{competition?.points_exact_score || 2}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">extras</p>
              <p className="mt-2 text-foreground">Acertar o placar exato.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-sm font-black uppercase tracking-wider text-accent">Desempate</p>
              <p className="mt-2 text-foreground">1. mais placares exatos</p>
              <p className="text-foreground">2. quem palpitou primeiro</p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-card border border-border rounded-xl p-4 text-sm font-semibold text-accent">{message}</div>
      )}

      {activeTab === "palpitar" && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando bolão...</p>
            ) : competition ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Competição</p>
                  <h2 className="text-xl font-black text-foreground">{competition.name}</h2>
                  {competition.description && <p className="mt-1 text-sm text-muted-foreground">{competition.description}</p>}
                </div>
                <Badge variant={competition.subscribers_only ? "yellow" : "green"}>
                  {competition.subscribers_only ? "Sócios" : "Aberto"}
                </Badge>
              </div>
            ) : null}
          </div>

          {competition && (
            <div className="bg-card border border-border rounded-xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="py-2 md:py-0">
                <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Seus Pontos</p>
                <p className="text-3xl font-bold text-accent">{userPointsTotal} PONTOS</p>
              </div>
              <div className="py-2 md:py-0">
                <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Acertos V/E</p>
                <p className="text-2xl font-bold text-foreground">{userWinnerHits}</p>
              </div>
              <div className="py-2 md:py-0">
                <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Placares exatos</p>
                <p className="text-2xl font-bold text-foreground">{userExactScoreHits}</p>
              </div>
            </div>
          )}

          {competition && matches.length === 0 && !loading && (
            <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
              Nenhum jogo cadastrado para esta competição ainda.
            </div>
          )}

          <div className="space-y-4">
            {matches.map((match) => {
              const prediction = predictionsByMatch[match.id];
              const draft = prediction
                ? { home: String(prediction.home_score), away: String(prediction.away_score) }
                : match.status === "finished"
                  ? { home: "", away: "" }
                  : scores[match.id] || { home: "0", away: "0" };
              const deadlinePassed = new Date(match.prediction_deadline).getTime() <= Date.now();
              const canEdit = competition?.status === "open" && !deadlinePassed && (match.status === "scheduled" || match.status === "open");
              const homeName = match.home_team?.short_name || match.home_team?.name || "Mandante";
              const awayName = match.away_team?.short_name || match.away_team?.name || "Visitante";

              return (
                <div key={match.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-sidebar px-4 py-2 flex items-center justify-between gap-3 border-b border-border">
                    <span className="text-xs text-muted-foreground font-semibold">
                      {formatDateTime(match.match_datetime)}
                      {(match.phase || match.round_label) && <> • {[match.phase, match.round_label].filter(Boolean).join(" • ")}</>}
                    </span>
                    {getMatchBadge(match)}
                  </div>

                  <div className="p-4 md:p-6 pb-4">
                    <div className="flex items-center justify-between gap-4 md:gap-8 max-w-xl mx-auto">
                      <div className="flex flex-col items-center flex-1">
                        <TeamLogo team={match.home_team} tone="home" />
                        <span className="mt-2 text-center text-sm font-black uppercase tracking-wide text-foreground line-clamp-1 md:text-base">{homeName}</span>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3 rounded-2xl border border-border bg-background p-2 shadow-inner md:gap-6">
                        <input type="number" min={0} value={draft.home} disabled={!canEdit} onChange={(event) => updateScore(match.id, "home", event.target.value)} className="w-12 h-12 bg-card border border-border rounded-lg text-center text-2xl font-bold text-foreground disabled:opacity-60" />
                        <span className="font-black text-muted-foreground">X</span>
                        <input type="number" min={0} value={draft.away} disabled={!canEdit} onChange={(event) => updateScore(match.id, "away", event.target.value)} className="w-12 h-12 bg-card border border-border rounded-lg text-center text-2xl font-bold text-foreground disabled:opacity-60" />
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <TeamLogo team={match.away_team} tone="away" />
                        <span className="mt-2 text-center text-sm font-black uppercase tracking-wide text-foreground line-clamp-1 md:text-base">{awayName}</span>
                      </div>
                    </div>

                    {match.status === "finished" && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>Resultado oficial: <span className="font-bold text-foreground">{match.home_score ?? "-"} x {match.away_score ?? "-"}</span></p>
                        {prediction ? (
                          <p className="mt-1">
                            V/E: <span className="font-bold text-foreground">{prediction.points_winner}</span>
                            {" • "}
                            Exato: <span className="font-bold text-foreground">{prediction.points_exact_score}</span>
                            {" • "}
                            Total: <span className="font-bold text-accent">{prediction.points_total}</span>
                          </p>
                        ) : (
                          <p className="mt-1 font-semibold text-muted-foreground">Sem palpite</p>
                        )}
                      </div>
                    )}

                    {!canEdit && match.status !== "finished" && (
                      <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">
                        {competition?.status === "open" ? "Palpites encerrados" : "Bolão fechado para palpites"}
                      </p>
                    )}

                    {prediction && <p className="mt-3 text-center text-xs font-semibold text-success">Palpite salvo</p>}
                  </div>

                  {match.status !== "finished" && (
                    <div className="px-4 py-3 bg-card border-t border-border">
                      <button type="button" onClick={() => savePrediction(match)} disabled={!canEdit || savingMatchId === match.id} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                        {savingMatchId === match.id ? "SALVANDO..." : prediction ? "ATUALIZAR PALPITE" : "SALVAR PALPITE"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {(activeTab === "ranking_geral" || activeTab === "ranking_assinantes") && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {activeTab === "ranking_assinantes" && profile?.plan_type === "torcedor" && (
              <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
                Assine um plano para concorrer aos prêmios exclusivos.
              </div>
            )}
            {activeTab === "ranking_geral"
              ? renderRanking(
                  generalRanking,
                  matches.some((match) => match.status === "finished")
                    ? "Ainda não há participantes ranqueados."
                    : "O ranking será atualizado após os primeiros resultados oficiais.",
                )
              : renderRanking(
                  subscribersRanking,
                  matches.some((match) => match.status === "finished")
                    ? "Ainda não há participantes ranqueados."
                    : "O ranking será atualizado após os primeiros resultados oficiais.",
                )}
          </div>
          <div>
            {renderPrizes()}
          </div>
        </div>
      )}
    </div>
  );
}
