"use client";

import { useState } from "react";
import { CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/utils";
import { Camera, Eye, CreditCard } from "lucide-react";

type Tab = "perfil" | "senha" | "endereco" | "plano";

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      
      <div className="flex items-center gap-6 border-b border-border pb-1 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab("perfil")}
          className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "perfil" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          PERFIL
          {activeTab === "perfil" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button 
          onClick={() => setActiveTab("senha")}
          className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "senha" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          SENHA
          {activeTab === "senha" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button 
          onClick={() => setActiveTab("endereco")}
          className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "endereco" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          ENDEREÇO
          {activeTab === "endereco" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button 
          onClick={() => setActiveTab("plano")}
          className={cn("text-sm font-bold pb-2 relative whitespace-nowrap", activeTab === "plano" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          PLANO & FATURAMENTO
          {activeTab === "plano" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {activeTab === "perfil" && (
          <div className="space-y-8 max-w-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group cursor-pointer">
                <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} className="w-24 h-24" />
                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white mb-1" />
                  <span className="text-[10px] text-white font-bold">Alterar</span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground mb-1">Foto de Perfil</p>
                <p className="text-xs text-muted-foreground max-w-xs">Recomendamos imagens com no mínimo 256x256px em formato JPG ou PNG.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Nome Completo</label>
                <input 
                  type="text" 
                  defaultValue={CURRENT_USER.name}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex justify-between">
                  Nome de Usuário
                  <span className="text-success text-xs">@ disponível</span>
                </label>
                <input 
                  type="text" 
                  defaultValue={CURRENT_USER.username.replace('@', '')}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <div className="relative">
                  <input 
                    type="email" 
                    readOnly
                    defaultValue="eduardo.h@example.com"
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Data de Nascimento</label>
                <input 
                  type="date" 
                  defaultValue="1995-04-12"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button className="bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-lg transition-colors">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === "plano" && (
          <div className="space-y-8 max-w-2xl">
            <div className="border border-accent bg-accent/5 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Seu plano atual</p>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-foreground capitalize">{CURRENT_USER.plan}</h3>
                  <Badge variant="gradient">Ativo</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Próxima cobrança: <strong className="text-foreground">10 de Maio de 2026</strong>
                </div>
              </div>
              <div className="w-full sm:w-auto flex flex-col gap-2">
                <button className="w-full sm:w-auto bg-accent text-bg-dark font-bold py-2 px-6 rounded-lg hover:bg-accent-dark transition-colors">
                  Fazer Upgrade
                </button>
                <button className="w-full sm:w-auto bg-transparent border border-border text-foreground font-bold py-2 px-6 rounded-lg hover:bg-sidebar transition-colors">
                  Gerenciar Assinatura
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg text-foreground mb-4">Cartão Cadastrado</h4>
              <div className="flex items-center justify-between border border-border bg-sidebar rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                    <CreditCard size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">•••• •••• •••• 4242</p>
                    <p className="text-xs text-muted-foreground">Expira em 12/28</p>
                  </div>
                </div>
                <button className="text-sm text-primary hover:text-primary-light font-bold">Editar</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg text-foreground mb-4 flex items-center justify-between">
                Histórico de Pagamentos
              </h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-sidebar text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Fatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    <tr className="hover:bg-sidebar transition-colors">
                      <td className="px-4 py-3 text-foreground">10 Abr 2026</td>
                      <td className="px-4 py-3 text-foreground">R$ 15,00</td>
                      <td className="px-4 py-3"><Badge variant="green">Pago</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-primary hover:text-primary-light font-semibold">Baixar PDF</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-sidebar transition-colors">
                      <td className="px-4 py-3 text-foreground">10 Mar 2026</td>
                      <td className="px-4 py-3 text-foreground">R$ 15,00</td>
                      <td className="px-4 py-3"><Badge variant="green">Pago</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-primary hover:text-primary-light font-semibold">Baixar PDF</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(activeTab === "senha" || activeTab === "endereco") && (
          <div className="py-12 text-center text-muted-foreground">
            Conteúdo da aba {activeTab}
          </div>
        )}
      </div>
    </div>
  );
}
