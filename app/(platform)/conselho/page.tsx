"use client";

import { useState } from "react";
import { MOCK_COUNCIL, CURRENT_USER } from "@/lib/mock-data";
import { PlanGate } from "@/components/shared/PlanGate";
import { Badge } from "@/components/shared/Badge";
import { Avatar } from "@/components/shared/Avatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { cn } from "@/lib/utils";
import { Calendar, Check, X, Minus } from "lucide-react";

type Tab = "abertas" | "fechadas";

export default function ConselhoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("abertas");

  const abertas = MOCK_COUNCIL.filter(c => c.status === "open");
  const fechadas = MOCK_COUNCIL.filter(c => c.status === "closed");
  const displayList = activeTab === "abertas" ? abertas : fechadas;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      <div className="xl:col-span-2 space-y-6">
        <div className="flex items-center gap-6 border-b border-border pb-1">
          <button 
            onClick={() => setActiveTab("abertas")}
            className={cn("text-sm font-bold pb-2 relative", activeTab === "abertas" ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            DECISÕES ABERTAS
            {activeTab === "abertas" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
          <button 
            onClick={() => setActiveTab("fechadas")}
            className={cn("text-sm font-bold pb-2 relative", activeTab === "fechadas" ? "text-white" : "text-muted-foreground hover:text-foreground")}
          >
            DECISÕES FECHADAS
            {activeTab === "fechadas" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
          </button>
        </div>

        <div className="space-y-6">
          {displayList.map(vote => (
            <div key={vote.id} className="bg-card rounded-xl border border-border p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Badge variant={vote.status === 'open' ? 'blue' : 'gray'}>{vote.category}</Badge>
                {vote.status === 'open' ? (
                  <span className="text-xs font-bold text-accent px-2 py-1 bg-accent/10 rounded-md">
                    Prazo {new Date(vote.deadline).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    Encerrada
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2 leading-snug">{vote.question}</h3>
              <p className="text-sm text-muted-foreground mb-6">{vote.description}</p>
              
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground font-semibold">Participação</span>
                  <span className="text-foreground font-bold">{vote.participation}%</span>
                </div>
                <ProgressBar percentage={vote.participation} indicatorClassName="bg-primary/70" className="h-1.5" />
              </div>

              {vote.status === 'closed' ? (
                <div className="bg-muted border border-border rounded-lg p-4 flex justify-between items-center">
                  <span className="text-foreground font-semibold">Resultado final:</span>
                  <Badge variant="green" className="text-sm px-3 py-1">{vote.result}</Badge>
                </div>
              ) : (
                <PlanGate 
                  requiredPlan={['camisa', 'campeao']} 
                  currentPlan={CURRENT_USER.plan}
                  fallbackMessage="Apenas conselheiros Plano Camisa ou Campeão podem votar em decisões do clube."
                >
                  <div className="grid grid-cols-3 gap-3">
                    <button className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors",
                      vote.myVote === 'yes' ? "border-success bg-success/10 text-success" : "border-border bg-sidebar hover:border-success/50 text-foreground"
                    )}>
                      <Check size={20} className="mb-1" />
                      <span className="font-bold text-sm">Sim</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors",
                      vote.myVote === 'no' ? "border-danger bg-danger/10 text-danger" : "border-border bg-sidebar hover:border-danger/50 text-foreground"
                    )}>
                      <X size={20} className="mb-1" />
                      <span className="font-bold text-sm">Não</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors",
                      vote.myVote === 'abstain' ? "border-muted-foreground bg-muted text-muted-foreground" : "border-border bg-sidebar hover:border-muted-foreground/50 text-foreground"
                    )}>
                      <Minus size={20} className="mb-1" />
                      <span className="font-bold text-sm">Abstenho</span>
                    </button>
                  </div>
                </PlanGate>
              )}
            </div>
          ))}
          {displayList.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p>Nenhuma decisão disponível nesta categoria.</p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden xl:block">
        <div className="bg-card rounded-xl border border-border p-6 sticky top-20">
          <h3 className="font-bold text-foreground mb-6">Painel do Conselheiro</h3>
          
          <div className="flex items-center gap-4 mb-6">
            <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} className="w-14 h-14" />
            <div>
              <p className="font-bold text-foreground">{CURRENT_USER.name}</p>
              <p className="text-xs text-muted-foreground">Membro há 15 meses</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Taxa de Presença</span>
                <span className="text-accent font-bold">100%</span>
              </div>
              <ProgressBar percentage={100} indicatorClassName="bg-accent" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Índice de Alinhamento</span>
                <span className="text-primary-light font-bold">85%</span>
              </div>
              <ProgressBar percentage={85} indicatorClassName="bg-primary-light" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Você vota junto com a maioria em 85% das vezes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sidebar rounded-lg p-3 text-center border border-border">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Conselheiros</p>
              <p className="text-2xl font-black text-foreground">1.432</p>
            </div>
            <div className="bg-sidebar rounded-lg p-3 text-center border border-border">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Seus Votos</p>
              <p className="text-2xl font-black text-foreground">42</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
