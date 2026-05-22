"use client";

import { MOCK_GOAL, MOCK_TRANSACTIONS } from "@/lib/mock-data";
import { BarChart, WalletCards, QrCode } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { useState } from "react";

export default function TransparenciaPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-background max-w-4xl mx-auto p-4 md:p-8">
      {/* Hero Section */}
      <div className="text-center mb-12 mt-8">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground flex items-center justify-center gap-4 mb-4">
          <BarChart className="text-primary w-10 h-10 md:w-14 md:h-14" />
          Portal de Transparência
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Cada centavo arrecadado pelo Camila é registrado aqui em tempo real.
        </p>
      </div>

      {/* Saldo Total */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-8 text-center text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Ao Vivo</span>
        </div>
        <p className="text-primary-foreground/80 font-semibold mb-2">Total arrecadado</p>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-2">
          {formatCurrency(MOCK_GOAL.raisedAmount)}
        </h2>
        <p className="text-sm text-primary-foreground/70">atualizado em tempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Card Meta */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-1">{MOCK_GOAL.title}</h3>
          <p className="text-sm text-muted-foreground mb-6">Meta atual de arrecadação</p>
          
          <div className="flex items-end justify-between font-bold text-lg mb-2">
            <span className="text-primary-light">{formatCurrency(MOCK_GOAL.raisedAmount)}</span>
            <span className="text-muted-foreground text-sm font-medium">
              de {formatCurrency(MOCK_GOAL.targetAmount)}
            </span>
          </div>
          <ProgressBar percentage={MOCK_GOAL.percentage} indicatorClassName="bg-primary-light" className="mb-2 h-2" />
          <p className="text-right text-xs font-bold text-accent">{MOCK_GOAL.percentage}%</p>
        </div>

        {/* Card Doar */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-foreground mb-4">Faça uma doação</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[10, 25, 50, 100].map(val => (
              <button 
                key={val}
                onClick={() => setSelectedAmount(val)}
                className={`py-2 px-4 rounded-lg font-bold text-sm border transition-colors ${
                  selectedAmount === val 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-background border-border text-foreground hover:border-primary/50'
                }`}
              >
                R${val}
              </button>
            ))}
            <button 
              onClick={() => setSelectedAmount(null)}
              className="py-2 px-4 rounded-lg font-bold text-sm border border-border text-foreground bg-background hover:border-primary/50"
            >
              Outro valor
            </button>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" id="anon" className="rounded border-border bg-background text-primary" />
              <label htmlFor="anon" className="text-sm text-muted-foreground">Quero ser anônimo</label>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-success hover:bg-success/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <QrCode size={18} /> PIX
              </button>
              <button className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <WalletCards size={18} /> Cartão
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div>
        <h3 className="font-bold text-foreground text-xl mb-4">Últimas Transações</h3>
        <div className="bg-card rounded-xl border border-border overflow-hidden pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground bg-opacity-50">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Protocolo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_TRANSACTIONS.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className={`px-4 py-3 font-medium ${t.name === 'Doador Anônimo' ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                      {t.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.protocol}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === 'Confirmado' ? 'green' : 'yellow'}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
