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

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

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

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function logSupabaseError(
  context: string,
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  },
) {
  console.error(context, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

function getCompetitionErrorMessage(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message?.toLowerCase() || "";

  if (error.code === "42501" || message.includes("row-level security")) {
    return "Sem permissão para salvar competição. Confirme se seu usuário está como admin.";
  }

  if (error.code === "23505") {
    return "Já existe uma competição com esse slug.";
  }

  if (message.includes("invalid input syntax")) {
    return "Confira as datas informadas.";
  }

  return error.message || "Não foi possível salvar a competição.";
}

function getSupabaseErrorMessage(
  error: {
    message?: string;
  },
  fallback: string,
) {
  return error.message || fallback;
}

export default function BolaoAdminPage() {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<BolaoCompetition[]>([]);
  const [teams, setTeams] = useState<BolaoTeam[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [editingCompetition, setEditingCompetition] = useState<BolaoCompetition | null>(null);
  const [editingTeam, setEditingTeam] = useState<BolaoTeam | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchWithTeams | null>(null);
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

  async function saveCompetition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    const slug = normalizeSlug(String(formData.get("slug") || ""));
    const payload = {
      name: String(formData.get("name") || "").trim(),
      slug,
      description: String(formData.get("description") || "").trim() || null,
      status: String(formData.get("status") || "draft"),
      starts_at: fromDateTimeLocal(String(formData.get("starts_at") || "")),
      ends_at: fromDateTimeLocal(String(formData.get("ends_at") || "")),
      points_winner: Number(formData.get("points_winner") || 3),
      points_exact_score: Number(formData.get("points_exact_score") || 2),
      subscribers_only: formData.get("subscribers_only") === "on",
    };

    const { error } = editingCompetition
      ? await supabase.from("bolao_competitions").update(payload).eq("id", editingCompetition.id)
      : await supabase.from("bolao_competitions").insert(payload);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao competition save failed", error);
      setMessage(getCompetitionErrorMessage(error));
      return;
    }

    event.currentTarget.reset();
    setEditingCompetition(null);
    setMessage(editingCompetition ? "Competição atualizada." : "Competição criada.");
    await loadAdminData();
  }

  async function updateCompetitionStatus(competition: BolaoCompetition, status: BolaoCompetition["status"]) {
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("bolao_competitions")
      .update({ status })
      .eq("id", competition.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao competition status update failed", error);
      setMessage(getCompetitionErrorMessage(error));
      return;
    }

    setMessage("Status atualizado.");
    await loadAdminData(selectedCompetitionId);
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      short_name: String(formData.get("short_name") || "").trim() || null,
      logo_url: String(formData.get("logo_url") || "").trim() || null,
    };

    const { error } = editingTeam
      ? await supabase.from("bolao_teams").update(payload).eq("id", editingTeam.id)
      : await supabase.from("bolao_teams").insert(payload);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao team save failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível salvar o time."));
      return;
    }

    event.currentTarget.reset();
    setEditingTeam(null);
    setMessage(editingTeam ? "Time atualizado." : "Time criado.");
    await loadAdminData();
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);

    const competitionId = String(formData.get("competition_id") || selectedCompetitionId);
    const payload = {
      competition_id: competitionId,
      home_team_id: String(formData.get("home_team_id") || ""),
      away_team_id: String(formData.get("away_team_id") || ""),
      phase: String(formData.get("phase") || "").trim() || null,
      round_label: String(formData.get("round_label") || "").trim() || null,
      match_datetime: fromDateTimeLocal(String(formData.get("match_datetime") || "")),
      prediction_deadline: fromDateTimeLocal(String(formData.get("prediction_deadline") || "")),
      status: String(formData.get("status") || "scheduled"),
    };

    const { error } = editingMatch
      ? await supabase.from("bolao_matches").update(payload).eq("id", editingMatch.id)
      : await supabase.from("bolao_matches").insert(payload);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao match save failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível salvar o jogo."));
      return;
    }

    event.currentTarget.reset();
    setEditingMatch(null);
    setSelectedCompetitionId(competitionId);
    setMessage(editingMatch ? "Jogo atualizado." : "Jogo criado.");
    await loadAdminData(competitionId);
  }

  async function saveResult(match: MatchWithTeams, form: HTMLFormElement) {
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
      .eq("id", match.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao result save failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível lançar o resultado."));
      return;
    }

    setMessage(
      match.status === "finished"
        ? "Resultado atualizado. Pontos recalculados pelo trigger."
        : "Resultado lançado. Pontos recalculados pelo trigger.",
    );
    await loadAdminData(selectedCompetitionId);
  }

  async function deleteCompetition(competition: BolaoCompetition) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta competição? Esta ação não poderá ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const [matchesResult, predictionsResult, prizesResult] = await Promise.all([
      supabase
        .from("bolao_matches")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id),
      supabase
        .from("bolao_predictions")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id),
      supabase
        .from("bolao_prizes")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id),
    ]);

    const countError = matchesResult.error || predictionsResult.error || prizesResult.error;

    if (countError) {
      setSaving(false);
      logSupabaseError("Bolao competition dependency check failed", countError);
      setMessage(getSupabaseErrorMessage(countError, "Não foi possível verificar dependências da competição."));
      return;
    }

    const hasDependencies =
      (matchesResult.count || 0) > 0 ||
      (predictionsResult.count || 0) > 0 ||
      (prizesResult.count || 0) > 0;

    if (hasDependencies) {
      setSaving(false);
      setMessage("Esta competição possui jogos, palpites ou prêmios. Para preservar o histórico, use Arquivar.");
      return;
    }

    const { error } = await supabase.from("bolao_competitions").delete().eq("id", competition.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao competition delete failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível excluir a competição."));
      return;
    }

    if (editingCompetition?.id === competition.id) {
      setEditingCompetition(null);
    }

    setMessage("Competição excluída.");
    await loadAdminData(selectedCompetitionId === competition.id ? "" : selectedCompetitionId);
  }

  async function deleteTeam(team: BolaoTeam) {
    const confirmed = window.confirm("Tem certeza que deseja excluir este time?");

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const { count, error: countError } = await supabase
      .from("bolao_matches")
      .select("id", { count: "exact", head: true })
      .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);

    if (countError) {
      setSaving(false);
      logSupabaseError("Bolao team dependency check failed", countError);
      setMessage(getSupabaseErrorMessage(countError, "Não foi possível verificar se o time possui jogos."));
      return;
    }

    if ((count || 0) > 0) {
      setSaving(false);
      setMessage("Este time já está vinculado a jogos e não pode ser excluído.");
      return;
    }

    const { error } = await supabase.from("bolao_teams").delete().eq("id", team.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao team delete failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível excluir o time."));
      return;
    }

    if (editingTeam?.id === team.id) {
      setEditingTeam(null);
    }

    setMessage("Time excluído.");
    await loadAdminData(selectedCompetitionId);
  }

  async function deleteMatch(match: MatchWithTeams) {
    const confirmed = window.confirm("Tem certeza que deseja excluir este jogo?");

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const { count, error: countError } = await supabase
      .from("bolao_predictions")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match.id);

    if (countError) {
      setSaving(false);
      logSupabaseError("Bolao match dependency check failed", countError);
      setMessage(getSupabaseErrorMessage(countError, "Não foi possível verificar palpites do jogo."));
      return;
    }

    if ((count || 0) > 0) {
      setSaving(false);
      setMessage("Este jogo já possui palpites. Para preservar o histórico, altere o status para cancelado.");
      return;
    }

    const { error } = await supabase.from("bolao_matches").delete().eq("id", match.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao match delete failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível excluir o jogo."));
      return;
    }

    if (editingMatch?.id === match.id) {
      setEditingMatch(null);
    }

    setMessage("Jogo excluído.");
    await loadAdminData(selectedCompetitionId);
  }

  async function cancelMatch(match: MatchWithTeams) {
    const confirmed = window.confirm("Tem certeza que deseja cancelar este jogo? Os palpites serão preservados.");

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("bolao_matches")
      .update({ status: "cancelled" })
      .eq("id", match.id);

    setSaving(false);

    if (error) {
      logSupabaseError("Bolao match cancel failed", error);
      setMessage(getSupabaseErrorMessage(error, "Não foi possível cancelar o jogo."));
      return;
    }

    if (editingMatch?.id === match.id) {
      setEditingMatch(null);
    }

    setMessage("Jogo cancelado. Palpites preservados.");
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
        <p className="mt-1 text-sm text-muted-foreground">Crie competições novas ou edite dados básicos das existentes.</p>
        <form
          key={editingCompetition?.id || "new-competition"}
          onSubmit={saveCompetition}
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <input name="name" defaultValue={editingCompetition?.name || ""} placeholder="Nome" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="slug" defaultValue={editingCompetition?.slug || ""} placeholder="slug-da-competicao" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <select name="status" defaultValue={editingCompetition?.status || "draft"} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            {competitionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input name="description" defaultValue={editingCompetition?.description || ""} placeholder="Descrição" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground md:col-span-3" />
          <input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(editingCompetition?.starts_at || null)} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(editingCompetition?.ends_at || null)} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            <input name="subscribers_only" type="checkbox" defaultChecked={editingCompetition?.subscribers_only || false} /> Só assinantes
          </label>
          <input name="points_winner" type="number" min={0} defaultValue={editingCompetition?.points_winner ?? 3} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="points_exact_score" type="number" min={0} defaultValue={editingCompetition?.points_exact_score ?? 2} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <div className="flex gap-2">
            <button disabled={saving} className="flex-1 rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">
              {editingCompetition ? "Salvar alterações" : "Criar competição"}
            </button>
            {editingCompetition && (
              <button
                type="button"
                onClick={() => setEditingCompetition(null)}
                className="rounded-lg border border-border px-4 text-sm font-bold text-muted-foreground"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {competitions.map((competition) => (
            <div key={competition.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">{competition.name}</p>
                  <p className="text-xs text-muted-foreground">{competition.slug} • {competition.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCompetition(competition)}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
                >
                  Editar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(competition.status === "draft" || competition.status === "closed") && (
                  <button type="button" disabled={saving} onClick={() => void updateCompetitionStatus(competition, "open")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Abrir</button>
                )}
                {competition.status === "open" && (
                  <button type="button" disabled={saving} onClick={() => void updateCompetitionStatus(competition, "closed")} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground disabled:opacity-60">Fechar</button>
                )}
                {(competition.status === "open" || competition.status === "closed") && (
                  <button type="button" disabled={saving} onClick={() => void updateCompetitionStatus(competition, "finished")} className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg-dark disabled:opacity-60">Finalizar</button>
                )}
                {(competition.status === "finished" || competition.status === "draft") && (
                  <button type="button" disabled={saving} onClick={() => void updateCompetitionStatus(competition, "archived")} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground disabled:opacity-60">Arquivar</button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void deleteCompetition(competition)}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-black text-foreground">Times</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre ou ajuste nomes, siglas e logos dos times.</p>
        <form
          key={editingTeam?.id || "new-team"}
          onSubmit={saveTeam}
          className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input name="name" defaultValue={editingTeam?.name || ""} placeholder="Nome" required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="short_name" defaultValue={editingTeam?.short_name || ""} placeholder="Nome curto" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="logo_url" defaultValue={editingTeam?.logo_url || ""} placeholder="URL do logo" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <div className="flex gap-2">
            <button disabled={saving} className="flex-1 rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">
              {editingTeam ? "Salvar alterações" : "Criar time"}
            </button>
            {editingTeam && (
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="rounded-lg border border-border px-4 text-sm font-bold text-muted-foreground"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
              <div>
                <p className="text-sm font-bold text-foreground">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.short_name || "Sem nome curto"}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeam(team)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteTeam(team)}
                className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-bold text-red-300 disabled:opacity-60"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-black text-foreground">Jogos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Crie jogos, edite dados básicos e lance ou corrija resultados oficiais.</p>
        <div className="mt-4">
          <label className="text-sm font-semibold text-muted-foreground">Competição selecionada</label>
          <select
            value={selectedCompetitionId}
            onChange={(event) => {
              setSelectedCompetitionId(event.target.value);
              setEditingMatch(null);
              void loadAdminData(event.target.value);
            }}
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
          >
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>{competition.name}</option>
            ))}
          </select>
        </div>

        <form
          key={editingMatch?.id || "new-match"}
          onSubmit={saveMatch}
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <input type="hidden" name="competition_id" value={selectedCompetitionId} />
          <select name="home_team_id" defaultValue={editingMatch?.home_team_id || ""} required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            <option value="">Mandante</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name="away_team_id" defaultValue={editingMatch?.away_team_id || ""} required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            <option value="">Visitante</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name="status" defaultValue={editingMatch?.status || "scheduled"} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            {matchStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input name="phase" defaultValue={editingMatch?.phase || ""} placeholder="Fase" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="round_label" defaultValue={editingMatch?.round_label || ""} placeholder="Rodada/Grupo" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="match_datetime" type="datetime-local" defaultValue={toDateTimeLocal(editingMatch?.match_datetime || null)} required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <input name="prediction_deadline" type="datetime-local" defaultValue={toDateTimeLocal(editingMatch?.prediction_deadline || null)} required className="rounded-lg border border-border bg-background p-3 text-sm text-foreground" />
          <div className="flex gap-2">
            <button disabled={saving || !selectedCompetitionId} className="flex-1 rounded-lg bg-primary p-3 text-sm font-bold text-white disabled:opacity-60">
              {editingMatch ? "Salvar alterações" : "Criar jogo"}
            </button>
            {editingMatch && (
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="rounded-lg border border-border px-4 text-sm font-bold text-muted-foreground"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 space-y-3">
          {matches.map((match) => (
            <form
              key={match.id}
              onSubmit={(event) => {
                event.preventDefault();
                void saveResult(match, event.currentTarget);
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
                <div className="flex items-center gap-2">
                  <Badge variant={match.status === "finished" ? "green" : "yellow"}>{match.status}</Badge>
                  <button
                    type="button"
                    onClick={() => setEditingMatch(match)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
                  >
                    Editar
                  </button>
                  {match.status !== "cancelled" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void cancelMatch(match)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground disabled:opacity-60"
                    >
                      Cancelar jogo
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void deleteMatch(match)}
                    className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-bold text-red-300 disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <input name="home_score" type="number" min={0} defaultValue={match.home_score ?? ""} placeholder="Mandante" className="rounded-lg border border-border bg-card p-3 text-sm text-foreground" />
                <input name="away_score" type="number" min={0} defaultValue={match.away_score ?? ""} placeholder="Visitante" className="rounded-lg border border-border bg-card p-3 text-sm text-foreground" />
                <button disabled={saving} className="rounded-lg bg-accent p-3 text-sm font-bold text-bg-dark disabled:opacity-60 md:col-span-2">
                  {match.status === "finished" ? "Atualizar resultado" : "Lançar resultado"}
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
