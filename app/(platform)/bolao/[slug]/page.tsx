"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import type { BolaoCompetition, BolaoPrediction, BolaoPrize, BolaoRankingRow } from "@/lib/types/bolao";

import { BolaoHeader } from "./components/BolaoHeader";
import { BolaoTabs, type TabType } from "./components/BolaoTabs";
import { BolaoStatsBar } from "./components/BolaoStatsBar";
import { MatchCard } from "./components/MatchCard";
import { TopRankingCard } from "./components/TopRankingCard";
import { RankingTable } from "./components/RankingTable";
import { PrizeSidebar } from "./components/PrizeSidebar";
import { RulesModal } from "./components/RulesModal";
import type { MatchWithTeams } from "./components/types";

type ScoreDraft = { home: string; away: string };

export default function BolaoDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("palpitar");
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
    if (!user?.id || !slug) return;
    setLoading(true);
    setMessage(null);

    const { data: selectedCompetition, error: competitionError } = await supabase
      .from("bolao_competitions")
      .select("*")
      .eq("slug", slug)
      .neq("status", "archived")
      .maybeSingle<BolaoCompetition>();

    if (competitionError || !selectedCompetition) {
      setCompetition(null);
      setMatches([]);
      setPredictionsByMatch({});
      setMessage(competitionError ? "Não foi possível carregar este bolão agora." : null);
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

    if (!prizesError) setPrizes(prizeRows || []);

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

  useEffect(() => { void loadBolao(); }, [loadBolao]);

  const loadRanking = useCallback(async (subscribersOnly: boolean) => {
    if (!competition?.id) return;
    setRankingLoading(true);
    setRankingError(null);

    const { data, error } = await supabase.rpc("get_bolao_ranking", {
      p_competition_id: competition.id,
      p_subscribers_only: subscribersOnly,
    });

    if (error) {
      setRankingError("Não foi possível carregar o ranking agora.");
    } else if (subscribersOnly) {
      setSubscribersRanking((data || []) as BolaoRankingRow[]);
    } else {
      setGeneralRanking((data || []) as BolaoRankingRow[]);
    }
    setRankingLoading(false);
  }, [competition?.id]);

  useEffect(() => {
    if (activeTab === "ranking_geral") void loadRanking(false);
    if (activeTab === "ranking_assinantes") void loadRanking(true);
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
        { competition_id: competition.id, match_id: match.id, user_id: user.id, home_score: homeScore, away_score: awayScore },
        { onConflict: "match_id,user_id" }
      )
      .select("*")
      .single<BolaoPrediction>();

    setSavingMatchId(null);
    if (error || !data) {
      setMessage("Não foi possível salvar seu palpite agora.");
      return;
    }

    setPredictionsByMatch((current) => ({ ...current, [match.id]: data }));
    setMessage("Palpite salvo com sucesso.");
  }

  const userPredictions = Object.values(predictionsByMatch);
  const userPointsTotal = userPredictions.reduce((total, prediction) => total + prediction.points_total, 0);
  const userWinnerHits = userPredictions.filter((prediction) => prediction.points_winner > 0).length;
  const userExactScoreHits = userPredictions.filter((prediction) => prediction.points_exact_score > 0).length;

  function renderRankingContent(rows: BolaoRankingRow[], emptyMessage: string) {
    if (!competition) return <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Bolão não encontrado.</div>;
    if (rankingLoading) return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Carregando ranking...</div>;
    if (rankingError) return <div className="rounded-xl border border-border bg-card p-6 text-sm font-semibold text-danger">{rankingError}</div>;
    if (rows.length === 0) return <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>;

    const topRows = rows.slice(0, 3);
    const remainingRows = rows.slice(3);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {topRows.map((row, index) => (
            <TopRankingCard key={row.user_id} row={row} index={index} />
          ))}
        </div>
        <RankingTable rows={remainingRows} />
      </div>
    );
  }

  if (!loading && !competition) {
    return (
      <div className="space-y-4">
        <Link href="/bolao" className="text-sm font-semibold text-accent hover:text-accent-dark">Voltar para bolões</Link>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Bolão não encontrado.</div>
      </div>
    );
  }

  const isDraftForUser = competition?.status === "draft" && profile?.role !== "admin";

  return (
    <div className="space-y-6 pb-12">
      <BolaoHeader competition={competition} onShowRules={() => setShowRules(true)} />

      {isDraftForUser && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Este bolão ainda não está aberto.
        </div>
      )}

      <BolaoTabs activeTab={activeTab} onChange={setActiveTab} />

      {message && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm font-semibold text-accent shadow-sm">{message}</div>
      )}

      {activeTab === "palpitar" && (
        <div className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando bolão...</p>
          ) : competition ? (
            <BolaoStatsBar
              competition={competition}
              userPointsTotal={userPointsTotal}
              userWinnerHits={userWinnerHits}
              userExactScoreHits={userExactScoreHits}
            />
          ) : null}

          {competition && matches.length === 0 && !loading && (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
              Nenhum jogo cadastrado para esta competição ainda.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => {
              const prediction = predictionsByMatch[match.id];
              const draft = prediction
                ? { home: String(prediction.home_score), away: String(prediction.away_score) }
                : match.status === "finished"
                  ? { home: "", away: "" }
                  : scores[match.id] || { home: "0", away: "0" };

              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  competition={competition}
                  prediction={prediction}
                  draft={draft}
                  savingMatchId={savingMatchId}
                  onUpdateScore={updateScore}
                  onSavePrediction={savePrediction}
                />
              );
            })}
          </div>
        </div>
      )}

      {(activeTab === "ranking_geral" || activeTab === "ranking_assinantes") && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {activeTab === "ranking_assinantes" && profile?.plan_type === "torcedor" && (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
                Assine um plano para concorrer aos prêmios exclusivos.
              </div>
            )}
            {activeTab === "ranking_geral"
              ? renderRankingContent(generalRanking, matches.some(m => m.status === "finished") ? "Ainda não há participantes ranqueados." : "O ranking será atualizado após os primeiros resultados oficiais.")
              : renderRankingContent(subscribersRanking, matches.some(m => m.status === "finished") ? "Ainda não há participantes ranqueados." : "O ranking será atualizado após os primeiros resultados oficiais.")}
          </div>
          <div>
            <PrizeSidebar prizes={prizes} />
          </div>
        </div>
      )}

      <RulesModal
        competition={competition}
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
