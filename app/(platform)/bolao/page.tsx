"use client";

import { useEffect, useState } from "react";
import { MOCK_POOL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Avatar } from "@/components/shared/Avatar";
import { supabase } from "@/lib/supabase/client";
import type { BolaoCompetition } from "@/lib/types/bolao";

type Tab = "palpitar" | "ranking_assinantes" | "ranking_geral";

export default function BolaoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("palpitar");
  const [competitions, setCompetitions] = useState<BolaoCompetition[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<string, {home: number, away: number}>>({
    'm1': { home: 2, away: 1 },
    'm2': { home: 0, away: 0 }
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCompetitions() {
      setCompetitionsLoading(true);
      setCompetitionsError(null);

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
        setCompetitionsError("Não foi possível carregar os bolões agora.");
      } else {
        setCompetitions(data || []);
      }

      setCompetitionsLoading(false);
    }

    void loadCompetitions();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateScore = (matchId: string, team: 'home' | 'away', delta: number) => {
    setScores(prev => {
      const current = prev[matchId] || { home: 0, away: 0 };
      const newValue = Math.max(0, current[team] + delta);
      return { ...prev, [matchId]: { ...current, [team]: newValue } };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab("palpitar")}
            className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "palpitar" ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            PALPITAR
            {activeTab === "palpitar" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
          <button 
            onClick={() => setActiveTab("ranking_assinantes")}
            className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "ranking_assinantes" ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            RANKING ASSINANTES
            {activeTab === "ranking_assinantes" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
          <button 
            onClick={() => setActiveTab("ranking_geral")}
            className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "ranking_geral" ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            RANKING GERAL
            {activeTab === "ranking_geral" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
        </div>
        <button className="text-muted-foreground hover:text-foreground hidden md:flex items-center gap-1.5 text-xs font-semibold">
          <Info size={14} /> Regras
        </button>
      </div>

      {activeTab === "palpitar" && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Competições</p>
                <h2 className="text-xl font-black text-foreground">Bolões disponíveis</h2>
              </div>
              {competitionsLoading && (
                <span className="text-sm text-muted-foreground">Carregando...</span>
              )}
            </div>

            {!competitionsLoading && competitionsError && (
              <p className="mt-4 text-sm font-semibold text-danger">{competitionsError}</p>
            )}

            {!competitionsLoading && !competitionsError && competitions.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum bolão disponível no momento.</p>
            )}

            {!competitionsLoading && competitions.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {competitions.map((competition) => (
                  <div key={competition.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">{competition.name}</p>
                        {competition.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{competition.description}</p>
                        )}
                      </div>
                      <Badge variant={competition.subscribers_only ? "yellow" : "green"}>
                        {competition.subscribers_only ? "Sócios" : "Aberto"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="py-2 md:py-0">
              <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Pontuação Total</p>
              <p className="text-3xl font-bold text-accent">15 PONTOS</p>
            </div>
            <div className="py-2 md:py-0">
              <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Vencedores ou empates</p>
              <p className="text-2xl font-bold text-foreground">3</p>
            </div>
            <div className="py-2 md:py-0">
              <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Placares exatos</p>
              <p className="text-2xl font-bold text-foreground">1</p>
            </div>
          </div>

          <div className="space-y-4">
            {MOCK_POOL.matches.map((match, i) => {
              const myObj = scores[match.id] || { home: 0, away: 0 };
              const isToday = i === 0;

              return (
                <div key={match.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-sidebar px-4 py-2 flex items-center justify-between border-b border-border">
                    <span className="text-xs text-muted-foreground font-semibold">
                      {new Date(match.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase()} • {new Date(match.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isToday ? (
                      <Badge variant="red" className="animate-pulse">HOJE</Badge>
                    ) : (
                      <Badge variant="yellow">FALTA 2 DIAS</Badge>
                    )}
                  </div>
                  <div className="p-4 md:p-6 pb-4">
                    <div className="flex items-center justify-between gap-4 md:gap-8 max-w-lg mx-auto">
                      
                      {/* Home Team */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-primary rounded-full flex items-center justify-center mb-2 border-2 border-background shadow-md">
                          <ShieldCheck size={28} className="text-primary-foreground" />
                        </div>
                        <span className="font-bold text-sm md:text-base text-center line-clamp-1">{match.homeTeam}</span>
                      </div>

                      {/* Inputs */}
                      <div className="flex items-center gap-3 md:gap-6 bg-background p-2 rounded-xl border border-border flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <button onClick={() => updateScore(match.id, 'home', 1)} className="w-8 h-6 md:w-10 md:h-8 bg-muted hover:bg-muted-foreground/30 rounded-t-lg flex items-center justify-center text-foreground font-black">+</button>
                          <div className="w-8 h-10 md:w-10 md:h-12 flex items-center justify-center font-bold text-2xl bg-card border-y border-border">{myObj.home}</div>
                          <button onClick={() => updateScore(match.id, 'home', -1)} className="w-8 h-6 md:w-10 md:h-8 bg-muted hover:bg-muted-foreground/30 rounded-b-lg flex items-center justify-center text-foreground font-black">-</button>
                        </div>
                        <span className="font-black text-muted-foreground">X</span>
                        <div className="flex flex-col items-center">
                          <button onClick={() => updateScore(match.id, 'away', 1)} className="w-8 h-6 md:w-10 md:h-8 bg-muted hover:bg-muted-foreground/30 rounded-t-lg flex items-center justify-center text-foreground font-black">+</button>
                          <div className="w-8 h-10 md:w-10 md:h-12 flex items-center justify-center font-bold text-2xl bg-card border-y border-border">{myObj.away}</div>
                          <button onClick={() => updateScore(match.id, 'away', -1)} className="w-8 h-6 md:w-10 md:h-8 bg-muted hover:bg-muted-foreground/30 rounded-b-lg flex items-center justify-center text-foreground font-black">-</button>
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mb-2 border-2 border-background shadow-md">
                          <ShieldCheck size={28} className="text-muted-foreground" />
                        </div>
                        <span className="font-bold text-sm md:text-base text-center line-clamp-1">{match.awayTeam}</span>
                      </div>

                    </div>
                  </div>
                  <div className="px-4 py-3 bg-card border-t border-border">
                    <button className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg transition-colors">
                      SALVAR PALPITE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(activeTab === "ranking_geral" || activeTab === "ranking_assinantes") && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end mb-8 pt-10">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Avatar name={MOCK_POOL.ranking[1].user.name!} className="w-16 h-16 md:w-20 md:h-20 border-4 border-[#C0C0C0]" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#C0C0C0] text-black w-6 h-6 rounded-full flex items-center justify-center font-black text-sm">2</div>
              </div>
              <p className="font-bold text-sm text-foreground text-center line-clamp-1">{MOCK_POOL.ranking[1].user.name}</p>
              <p className="font-black text-accent text-lg">{MOCK_POOL.ranking[1].points} pts</p>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center -translate-y-6">
              <div className="relative mb-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">👑</div>
                <Avatar name={MOCK_POOL.ranking[0].user.name!} className="w-20 h-20 md:w-24 md:h-24 border-4 border-accent" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-accent text-black w-8 h-8 rounded-full flex items-center justify-center font-black text-lg">1</div>
              </div>
              <p className="font-bold text-base text-foreground text-center line-clamp-1">{MOCK_POOL.ranking[0].user.name}</p>
              <p className="font-black text-accent text-2xl">{MOCK_POOL.ranking[0].points} pts</p>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Avatar name={MOCK_POOL.ranking[2].user.name!} className="w-16 h-16 md:w-20 md:h-20 border-4 border-[#CD7F32]" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-black w-6 h-6 rounded-full flex items-center justify-center font-black text-sm">3</div>
              </div>
              <p className="font-bold text-sm text-foreground text-center line-clamp-1">{MOCK_POOL.ranking[2].user.name}</p>
              <p className="font-black text-accent text-lg">{MOCK_POOL.ranking[2].points} pts</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground bg-opacity-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                  <th className="px-4 py-3 font-medium">Torcedor</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell text-center" title="Placar Exato">Acertos</th>
                  <th className="px-4 py-3 font-black text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_POOL.ranking.slice(3).map((r) => (
                  <tr key={r.position} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 text-muted-foreground font-bold text-center">
                      {r.position}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.user.name!} className="w-8 h-8 rounded-md" />
                        <span className="font-bold text-foreground">{r.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground hidden md:table-cell text-center">
                      {r.correctScores} placares
                    </td>
                    <td className="px-4 py-4 font-black text-accent text-right text-base">
                      {r.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
