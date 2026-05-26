"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/shared/Badge";
import { supabase } from "@/lib/supabase/client";
import type { BolaoCompetition, BolaoMatch, BolaoTeam } from "@/lib/types/bolao";

type MatchWithTeams = BolaoMatch & {
  home_team: Pick<BolaoTeam, "name" | "short_name"> | null;
  away_team: Pick<BolaoTeam, "name" | "short_name"> | null;
};

const competitionStatuses = ["draft", "open", "closed", "finished", "archived"] as const;
const matchStatuses = ["scheduled", "open", "locked", "finished", "cancelled"] as const;

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function BolaoAdminPage() {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<BolaoCompetition[]>([]);
  const [teams, setTeams] = useState<BolaoTeam[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAdminData(competitionId = selectedCompetitionId) {
    setLoading(true);
    setMessage(null);

    const [competitionsResult, teamsResult] = await Promise.all([
      supabase
        .from("bolao_competitions")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<BolaoCompetition[]>(),
      supabase
        .from("bolao_teams")
        .select("*")
        .order("name", { ascending: true })
        .returns<BolaoTeam[]>(),
    ]);

    if (competitionsResult.error || teamsResult.error) {
      setMessage("Não foi possível carregar os dados do admin.");
      setLoading(false);
      return;
    }

    const nextCompetitions = competitionsResult.data || [];
    const nextCompetitionId = competitionId || nextCompetitions[0]?.id || "";

    setCompetitions(nextCompetitions);
    setTeams(teamsResult.data || []);
    setSelectedCompetitionId(nextCompetitionId);

    if (nextCompetitionId) {
      const { data, error } = await supabase
        .from("bolao_matches")
        .select(`
          *,
          home_team:bolao_teams!bolao_matches_home_team_id_fkey(name,short_name),
          away_team:bolao_teams!bolao_matches_away_team_id_fkey(name,short_name)
        `)
        .eq("competition_id", nextCompetitionId)
        .order("match_datetime", { ascending: true })
        .returns<MatchWithTeams[]>();

      if (error) {
        setMatches([]);
        setMessage("Não foi possível carregar os jogos.");
      } else {
        setMatches(data || []);
      }
    } else {
      setMatches([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (profile?.role === "admin") {
      void loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  if (profile?.role !== "admin") {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-xl font-black text-foreground">Admin do Bolão</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso restrito aos administradores.</p>
      </div>
    );
  }

  async function createCompetition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("bolao_competitions").insert({
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      status: String(formData.get("status") || "draft"),
      starts_at: fromDateTimeLocal(String(formData.get("starts_at") || "")),
      ends_at: fromDateTimeLocal(String(formData.get("ends_at") || "")),
      points_winner: Number(formData.get("points_winner") || 3),
      points_exact_score: Number(formData.get("points_exact_score") || 2),
      subscribers_only: formData.get("subscribers_only") === "on",
    });

    setSaving(false);

    if (error) {
      setMessage("Não foi possível criar a competição.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Competição criada.");
    await loadAdminData();
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("bolao_teams").insert({
      name: String(formData.get("name") || "").trim(),
      short_name: String(formData.get("short_name") || "").trim() || null,
      logo_url: String(formData.get("logo_url") || "").trim() || null,
    });

    setSaving(false);

    if (error) {
      setMessage("Não foi possível criar o time.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Time criado.");
    await loadAdminData();
  }

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);

    const competitionId = String(formData.get("competition_id") || selectedCompetitionId);
    const { error } = await supabase.from("bolao_matches").insert({
      competition_id: competitionId,
      home_team_id: String(formData.get("home_team_id") || ""),
      away_team_id: String(formData.get("away_team_id") || ""),
      phase: String(formData.get("phase") || "").trim() || null,
      round_label: String(formData.get("round_label") || "").trim() || null,
      match_datetime: fromDateTimeLocal(String(formData.get("match_datetime") || "")),
      prediction_deadline: fromDateTimeLocal(String(formData.get("prediction_deadline") || "")),
      status: String(formData.get("status") || "scheduled"),
    });

    setSaving(false);

    if (error) {
      setMessage("Não foi possível criar o jogo.");
      return;
    }

    event.currentTarget.reset();
    setSelectedCompetitionId(competitionId);
    setMessage("Jogo criado.");
    await loadAdminData(competitionId);
  }

  async function saveResult(matchId: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    const homeScore = Number(formData.get("home_score"));
    const awayScore = Number(formData.get("away_score"));

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setMessage("Informe placares válidos.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("bolao_matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "finished",
      })
      .eq("id", matchId);

    setSaving(false);

    if (error) {
      setMessage("Não foi possível lançar o resultado.");
      return;
    }

    setMessage("Resultado lançado. Pontos recalculados pelo trigger.");
    await loadAdminData(selectedCompetitionId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Área administrativa</p>
          <h1 className="text-2xl font-black text-foreground">Admin do Bolão</h1>
        </div>
        {loading && <span className="text-sm text-muted-foreground">Carregando...</span>}
      </div>

      {message && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm font-semibold text-accent">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-black text-foreground">Competições</h2>
        <form onSubmit={createCompetition} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="name" placeholder="Nome" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="slug" placeholder="slug-da-competicao" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <select name="status" defaultValue="draft" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            {competitionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input name="description" placeholder="Descrição" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground md:col-span-3" />
          <input name="starts_at" type="datetime-local" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="ends_at" type="datetime-local" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            <input name="subscribers_only" type="checkbox" /> Só assinantes
          </label>
          <input name="points_winner" type="number" min={0} defaultValue={3} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="points_exact_score" type="number" min={0} defaultValue={2} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <button disabled={saving} className="rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">Criar competição</button>
        </form>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {competitions.map((competition) => (
            <div key={competition.id} className="rounded-lg border border-border bg-background p-3">
              <p className="font-bold text-foreground">{competition.name}</p>
              <p className="text-xs text-muted-foreground">{competition.slug} • {competition.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-black text-foreground">Times</h2>
        <form onSubmit={createTeam} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input name="name" placeholder="Nome" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="short_name" placeholder="Nome curto" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="logo_url" placeholder="URL do logo" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <button disabled={saving} className="rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">Criar time</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {teams.map((team) => (
            <Badge key={team.id} variant="gray">{team.short_name || team.name}</Badge>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-black text-foreground">Jogos</h2>
        <div className="mt-4">
          <label className="text-sm font-semibold text-muted-foreground">Competição selecionada</label>
          <select
            value={selectedCompetitionId}
            onChange={(event) => {
              setSelectedCompetitionId(event.target.value);
              void loadAdminData(event.target.value);
            }}
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
          >
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>{competition.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={createMatch} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="hidden" name="competition_id" value={selectedCompetitionId} />
          <select name="home_team_id" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            <option value="">Mandante</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name="away_team_id" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            <option value="">Visitante</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name="status" defaultValue="scheduled" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            {matchStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input name="phase" placeholder="Fase" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="round_label" placeholder="Rodada/Grupo" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="match_datetime" type="datetime-local" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="prediction_deadline" type="datetime-local" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <button disabled={saving || !selectedCompetitionId} className="rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">Criar jogo</button>
        </form>

        <div className="mt-5 space-y-3">
          {matches.map((match) => (
            <form
              key={match.id}
              onSubmit={(event) => {
                event.preventDefault();
                void saveResult(match.id, event.currentTarget);
              }}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">
                    {match.home_team?.short_name || match.home_team?.name} x {match.away_team?.short_name || match.away_team?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.phase || "Sem fase"} • {match.round_label || "Sem rodada"} • {new Date(match.match_datetime).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant={match.status === "finished" ? "green" : "yellow"}>{match.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <input name="home_score" type="number" min={0} defaultValue={match.home_score ?? ""} placeholder="Mandante" className="rounded-lg border border-border bg-card p-3 text-sm text-foreground" />
                <input name="away_score" type="number" min={0} defaultValue={match.away_score ?? ""} placeholder="Visitante" className="rounded-lg border border-border bg-card p-3 text-sm text-foreground" />
                <button disabled={saving} className="rounded-lg bg-accent p-3 text-sm font-bold text-bg-dark disabled:opacity-60 md:col-span-2">
                  Lançar resultado
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
