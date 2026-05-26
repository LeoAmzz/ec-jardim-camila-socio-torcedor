"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/shared/Badge";
import { supabase } from "@/lib/supabase/client";
import type { BolaoCompetition } from "@/lib/types/bolao";

function getStatusLabel(status: BolaoCompetition["status"]) {
  const labels = {
    draft: "Rascunho",
    open: "Aberto",
    closed: "Fechado",
    finished: "Finalizado",
    archived: "Arquivado",
  };

  return labels[status];
}

function getButtonLabel(status: BolaoCompetition["status"]) {
  if (status === "open") {
    return "Entrar no bolão";
  }

  if (status === "finished") {
    return "Ver ranking";
  }

  return "Ver detalhes";
}

function formatPeriod(start: string | null, end: string | null) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (start && end) {
    return `${formatter.format(new Date(start))} até ${formatter.format(new Date(end))}`;
  }

  if (start) {
    return `A partir de ${formatter.format(new Date(start))}`;
  }

  if (end) {
    return `Até ${formatter.format(new Date(end))}`;
  }

  return null;
}

function CompetitionCard({ competition }: { competition: BolaoCompetition }) {
  const period = formatPeriod(competition.starts_at, competition.ends_at);
  const isOpen = competition.status === "open";

  return (
    <div className={`relative overflow-hidden bg-card border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:border-primary/30 hover:shadow-lg ${isOpen ? "border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "border-border"}`}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${isOpen ? "bg-primary/20" : "bg-primary/5"}`} />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">{isOpen ? "Bolão aberto" : "Bolão"}</p>
          <h2 className="mt-1 text-2xl font-black leading-tight tracking-tight text-foreground">{competition.name}</h2>
          {competition.description && (
            <p className="mt-2 text-sm text-muted-foreground">{competition.description}</p>
          )}
        </div>
        <Badge variant={competition.status === "open" ? "green" : competition.status === "finished" ? "gray" : "yellow"}>
          {getStatusLabel(competition.status)}
        </Badge>
      </div>

      <div className="relative z-10 rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground shadow-inner">
        {period && <p className="font-semibold text-foreground">{period}</p>}
        {competition.subscribers_only && (
          <p className="mt-1 font-black text-accent uppercase tracking-wider text-[10px]">Exclusivo para assinantes</p>
        )}
        {!period && !competition.subscribers_only && <p>Competição aberta para a torcida.</p>}
      </div>

      <Link
        href={`/bolao/${competition.slug}`}
        className={`relative z-10 mt-auto rounded-xl px-4 py-3 text-center text-sm font-black uppercase tracking-widest transition-all ${isOpen ? "bg-primary text-white shadow-md hover:bg-primary-light hover:shadow-lg" : "border border-border text-foreground hover:border-primary/60 hover:text-accent hover:bg-primary/5"}`}
      >
        {getButtonLabel(competition.status)}
      </Link>
    </div>
  );
}

export default function BolaoCentralPage() {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<BolaoCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCompetitions() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("bolao_competitions")
        .select("*")
        .neq("status", "archived")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .returns<BolaoCompetition[]>();

      if (!isMounted) {
        return;
      }

      if (error) {
        setCompetitions([]);
        setMessage("Não foi possível carregar os bolões agora.");
      } else {
        setCompetitions(data || []);
      }

      setLoading(false);
    }

    void loadCompetitions();

    return () => {
      isMounted = false;
    };
  }, []);

  const now = Date.now();
  const openCompetitions = competitions.filter((competition) => competition.status === "open");
  const upcomingCompetitions = competitions.filter((competition) => {
    const startsAt = competition.starts_at ? new Date(competition.starts_at).getTime() : null;
    return (competition.status === "draft" || competition.status === "closed") && (!startsAt || startsAt > now);
  });
  const finishedCompetitions = competitions.filter((competition) => competition.status === "finished");

  function renderGroup(title: string, items: BolaoCompetition[], empty: string) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {empty}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bolão Camila</p>
          <h1 className="text-2xl font-black text-foreground">Escolha uma competição</h1>
        </div>
        {profile?.role === "admin" && (
          <Link href="/bolao/admin" className="text-sm font-semibold text-accent hover:text-accent-dark">
            Admin do Bolão
          </Link>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Carregando bolões...
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-semibold text-accent">
          {message}
        </div>
      )}

      {!loading && !message && competitions.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Nenhum bolão disponível no momento.
        </div>
      )}

      {!loading && competitions.length > 0 && (
        <>
          {renderGroup("Em andamento", openCompetitions, "Nenhum bolão aberto no momento.")}
          {renderGroup("Em breve", upcomingCompetitions, "Nenhum bolão futuro cadastrado.")}
          {renderGroup("Finalizados", finishedCompetitions, "Nenhum bolão finalizado ainda.")}
        </>
      )}
    </div>
  );
}
