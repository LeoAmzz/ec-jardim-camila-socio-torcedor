"use client";

import { CheckCircle2, Shield, Shirt, Trophy } from "lucide-react";

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Seja Sócio do Camila</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Faça parte da nossa história. Escolha o plano que mais combina com você, ajude o clube a crescer e ganhe benefícios exclusivos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Torcedor */}
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col h-full transform transition-transform hover:scale-105">
            <div className="mb-8">
              <span className="inline-block bg-muted text-muted-foreground font-bold text-xs px-3 py-1 rounded-full mb-4">GRÁTIS</span>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="text-primary w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Torcedor</h3>
              </div>
              <p className="text-muted-foreground text-sm">O primeiro passo na nossa plataforma online.</p>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1 text-sm text-foreground">
              <li className="flex gap-3"><CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Acesso ao feed geral do clube</li>
              <li className="flex gap-3"><CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Perfil na plataforma</li>
              <li className="flex gap-3"><CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Participação na torcida organizada</li>
            </ul>
            
            <button className="w-full py-3 rounded-lg font-bold border border-primary text-primary hover:bg-primary/10 transition-colors">
              Começar grátis
            </button>
          </div>

          {/* Camisa */}
          <div className="bg-card rounded-2xl border-2 border-accent p-8 flex flex-col h-full relative transform scale-100 md:scale-105 shadow-2xl z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-bg-dark font-bold text-xs tracking-wider px-4 py-1 rounded-full whitespace-nowrap">
              MAIS POPULAR
            </div>
            
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2 mt-2">
                <Shirt className="text-accent w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Camisa</h3>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">R$ 15,00<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <p className="text-muted-foreground text-sm">O plano perfeito para os fanáticos.</p>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1 text-sm text-foreground">
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Tudo do Torcedor</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Feed exclusivo para assinantes</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Acesso ao Bolão de partidas</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Sorteios mensais</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Carteirinha digital</li>
            </ul>
            
            <button className="w-full py-3 rounded-lg font-bold bg-accent text-bg-dark hover:bg-accent-dark transition-colors shadow-lg">
              Assinar agora
            </button>
          </div>

          {/* Campeão */}
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col h-full transform transition-transform hover:scale-105">
            <div className="mb-8">
              <span className="inline-block bg-gradient-to-r from-primary to-accent text-white font-bold text-xs px-3 py-1 rounded-full mb-4">CAMPEÃO</span>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-accent w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Campeão</h3>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">R$ 39,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <p className="text-muted-foreground text-sm">Para os verdadeiros líderes da torcida.</p>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1 text-sm text-foreground">
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Tudo do Camisa</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Conselho de Votação do clube</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Sorteios premium (camisas autografadas)</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Camisa física anual do clube</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Carteirinha física na sua casa</li>
            </ul>
            
            <button className="w-full py-3 rounded-lg font-bold bg-primary text-white hover:bg-primary-light transition-colors shadow-lg">
              Quero ser Campeão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
