"use client";

import { CheckCircle2, Shield, Shirt, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { isPaidPlan } from "@/lib/plans";
import { supabase } from "@/lib/supabase/client";
import type { PlanType } from "@/lib/types/membership";

type Membership = {
  id: string;
  user_id: string;
  plan_type: Exclude<PlanType, "torcedor">;
  provider: string;
  provider_subscription_id: string | null;
  status: string;
  raw_status: string | null;
  started_at: string | null;
  ended_at: string | null;
  access_until: string | null;
  last_event_at: string | null;
  created_at: string | null;
};

export default function PlanosPage() {
  return (
    <AuthProvider>
      <PlanosContent />
    </AuthProvider>
  );
}

function PlanosContent() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [isPreparingCheckout, setIsPreparingCheckout] = useState<PlanType | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipRefreshKey, setMembershipRefreshKey] = useState(0);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const currentPlan = profile?.plan_type || "torcedor";
  const currentPlanName = currentPlan === "campeao" ? "Campeão" : currentPlan === "camisa" ? "Camisa" : "Torcedor";

  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get("checkout");

    if (checkout === "success" || checkout === "cancel" || checkout === "error") {
      setCheckoutStatus(checkout);
    }

    if (checkout === "success") {
      void refreshProfile();
    }
  }, [refreshProfile]);

  useEffect(() => {
    let isMounted = true;

    async function loadMembership() {
      if (!user?.id) {
        setMembership(null);
        setMembershipError(null);
        return;
      }

      setMembershipLoading(true);
      setMembershipError(null);

      const { data, error } = await supabase
        .from("memberships")
        .select("id,user_id,plan_type,provider,provider_subscription_id,status,raw_status,started_at,ended_at,access_until,last_event_at,created_at")
        .eq("user_id", user.id)
        .eq("provider", "asaas")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Membership>();

      if (!isMounted) {
        return;
      }

      if (error) {
        setMembership(null);
        setMembershipError("Não foi possível carregar sua assinatura agora.");
      } else {
        setMembership(data);
      }

      setMembershipLoading(false);
    }

    void loadMembership();

    return () => {
      isMounted = false;
    };
  }, [user?.id, checkoutStatus, membershipRefreshKey]);

  function isCurrentPlan(plan: PlanType) {
    return Boolean(user) && currentPlan === plan;
  }

  function getCheckoutMessage() {
    if (checkoutStatus === "success" && (currentPlan === "camisa" || currentPlan === "campeao")) {
      return `Assinatura ativa! Seu plano atual é ${currentPlanName}.`;
    }

    if (checkoutStatus === "success") {
      return "Pagamento recebido! Estamos atualizando seu plano. Se o plano ainda não aparecer, aguarde alguns segundos e atualize a página.";
    }

    if (checkoutStatus === "cancel" || checkoutStatus === "error") {
      return "Assinatura não concluída. Você pode tentar novamente quando quiser.";
    }

    return null;
  }

  function getPlanName(plan: PlanType) {
    if (plan === "campeao") {
      return "Campeão";
    }

    if (plan === "camisa") {
      return "Camisa";
    }

    return "Torcedor";
  }

  function getMembershipStatusLabel(status?: string | null, rawStatus?: string | null) {
    const normalizedStatus = (status || rawStatus || "").toLowerCase();

    if (normalizedStatus === "active" || normalizedStatus === "received" || normalizedStatus === "confirmed") {
      return "Ativa";
    }

    if (normalizedStatus === "pending" || normalizedStatus === "in_process") {
      return "Pendente";
    }

    if (
      normalizedStatus === "inactive_pending_webhook" ||
      normalizedStatus === "cancelled_at_period_end" ||
      normalizedStatus === "delete_requested"
    ) {
      return "Cancelada, com acesso até o fim do período";
    }

    if (normalizedStatus === "cancelled" || normalizedStatus === "canceled" || normalizedStatus === "inactive") {
      return "Inativa";
    }

    if (normalizedStatus === "refunded") {
      return "Estornada";
    }

    return status || rawStatus || "Status não informado";
  }

  function isActiveMembership(status?: string | null) {
    return status === "active" || status === "confirmed" || status === "received";
  }

  function isCancelledWithAccess(status?: string | null) {
    return status === "cancelled_at_period_end" && Boolean(membership?.access_until);
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "Não informado";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function getCurrentPlanCardStatus(plan: Exclude<PlanType, "torcedor">) {
    if (!isCurrentPlan(plan)) {
      return null;
    }

    if (membership?.plan_type === plan && isCancelledWithAccess(membership.status)) {
      return `Acesso ativo até ${formatDate(membership.access_until)}`;
    }

    return "Assinatura ativa";
  }

  async function handleChoosePlan(plan: PlanType) {
    if (!user) {
      setMessage("Crie sua conta ou faça login para escolher um plano.");
      return;
    }

    if (isCurrentPlan(plan)) {
      return;
    }

    if (!isPaidPlan(plan)) {
      setMessage("O plano Torcedor é gratuito e não precisa de checkout.");
      return;
    }

    setIsPreparingCheckout(plan);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Sua sessão expirou. Faça login novamente para continuar.");
        return;
      }

      const response = await fetch("/api/checkout/asaas-membership", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType: plan }),
      });
      const data = await response.json().catch(() => null) as { checkout_url?: string; message?: string } | null;

      if (!response.ok) {
        setMessage(data?.message || "Não foi possível preparar a assinatura agora.");
        return;
      }

      if (!data?.checkout_url) {
        setMessage(data?.message || "Checkout indisponível no momento.");
        return;
      }

      window.location.href = data.checkout_url;
    } catch {
      setMessage("Não foi possível preparar a assinatura agora. Tente novamente em instantes.");
    } finally {
      setIsPreparingCheckout(null);
    }
  }

  async function handleCancelSubscription() {
    if (!membership || !isActiveMembership(membership.status)) {
      setMessage("Nenhuma assinatura ativa encontrada.");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar sua assinatura? Seu acesso será ajustado após confirmação do Asaas."
    );

    if (!confirmed) {
      return;
    }

    setIsCancellingSubscription(true);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Sua sessão expirou. Faça login novamente para continuar.");
        return;
      }

      const response = await fetch("/api/subscriptions/asaas/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json().catch(() => null) as { message?: string } | null;

      if (!response.ok) {
        setMessage(data?.message || "Não foi possível solicitar o cancelamento agora.");
        return;
      }

      setMessage(data?.message || "Solicitação de cancelamento enviada. Aguarde a confirmação.");
      setMembershipRefreshKey((current) => current + 1);
    } catch {
      setMessage("Não foi possível solicitar o cancelamento agora. Tente novamente em instantes.");
    } finally {
      setIsCancellingSubscription(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Seja Sócio do Camila</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Faça parte da nossa história. Escolha o plano que mais combina com você, ajude o clube a crescer e ganhe benefícios exclusivos.
          </p>
          {message && (
            <p className="mt-4 text-sm font-semibold text-accent">
              {message}
            </p>
          )}
          {getCheckoutMessage() && (
            <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
              {getCheckoutMessage()}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Torcedor */}
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col h-full transform transition-transform hover:scale-105">
            <div className="mb-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-block bg-muted text-muted-foreground font-bold text-xs px-3 py-1 rounded-full">GRÁTIS</span>
                {isCurrentPlan("torcedor") && (
                  <span className="inline-block bg-primary text-white font-bold text-xs px-3 py-1 rounded-full">PLANO ATUAL</span>
                )}
              </div>
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
            
            {!user ? (
              <Link href="/cadastro" className="w-full py-3 rounded-lg font-bold border border-primary text-primary hover:bg-primary/10 transition-colors text-center">
                Começar grátis
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleChoosePlan("torcedor")}
                disabled={isCurrentPlan("torcedor") || profileLoading || isPreparingCheckout !== null}
                className="w-full py-3 rounded-lg font-bold border border-primary text-primary hover:bg-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCurrentPlan("torcedor") ? "Plano atual" : "Selecionar plano"}
              </button>
            )}
          </div>

          {/* Camisa */}
          <div className="bg-card rounded-2xl border-2 border-accent p-8 flex flex-col h-full relative transform scale-100 md:scale-105 shadow-2xl z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-bg-dark font-bold text-xs tracking-wider px-4 py-1 rounded-full whitespace-nowrap">
              {isCurrentPlan("camisa") ? "PLANO ATUAL" : "MAIS POPULAR"}
            </div>
            
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2 mt-2">
                <Shirt className="text-accent w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Camisa</h3>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">R$ 15,00<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <p className="text-muted-foreground text-sm">O plano perfeito para os fanáticos.</p>
              {getCurrentPlanCardStatus("camisa") && (
                <p className="mt-2 text-xs font-semibold text-accent">{getCurrentPlanCardStatus("camisa")}</p>
              )}
            </div>
            
            <ul className="space-y-4 mb-8 flex-1 text-sm text-foreground">
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Tudo do Torcedor</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Feed exclusivo para assinantes</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Acesso ao Bolão de partidas</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Sorteios mensais</li>
              <li className="flex gap-3"><CheckCircle2 className="text-accent w-5 h-5 flex-shrink-0" /> Carteirinha digital</li>
            </ul>
            
            {!user ? (
              <Link href="/cadastro" className="w-full py-3 rounded-lg font-bold bg-accent text-bg-dark hover:bg-accent-dark transition-colors shadow-lg text-center">
                Escolher plano
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleChoosePlan("camisa")}
                disabled={isCurrentPlan("camisa") || profileLoading || isPreparingCheckout !== null}
                className="w-full py-3 rounded-lg font-bold bg-accent text-bg-dark hover:bg-accent-dark transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCurrentPlan("camisa") ? "Plano atual" : isPreparingCheckout === "camisa" ? "Preparando..." : "Preparar assinatura"}
              </button>
            )}
          </div>

          {/* Campeão */}
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col h-full transform transition-transform hover:scale-105">
            <div className="mb-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-block bg-gradient-to-r from-primary to-accent text-white font-bold text-xs px-3 py-1 rounded-full">CAMPEÃO</span>
                {isCurrentPlan("campeao") && (
                  <span className="inline-block bg-primary text-white font-bold text-xs px-3 py-1 rounded-full">PLANO ATUAL</span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-accent w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Campeão</h3>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">R$ 39,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <p className="text-muted-foreground text-sm">Para os verdadeiros líderes da torcida.</p>
              {getCurrentPlanCardStatus("campeao") && (
                <p className="mt-2 text-xs font-semibold text-accent">{getCurrentPlanCardStatus("campeao")}</p>
              )}
            </div>
            
            <ul className="space-y-4 mb-8 flex-1 text-sm text-foreground">
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Tudo do Camisa</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Conselho de Votação do clube</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Sorteios premium (camisas autografadas)</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Camisa física anual do clube</li>
              <li className="flex gap-3"><CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Carteirinha física na sua casa</li>
            </ul>
            
            {!user ? (
              <Link href="/cadastro" className="w-full py-3 rounded-lg font-bold bg-primary text-white hover:bg-primary-light transition-colors shadow-lg text-center">
                Escolher plano
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleChoosePlan("campeao")}
                disabled={isCurrentPlan("campeao") || profileLoading || isPreparingCheckout !== null}
                className="w-full py-3 rounded-lg font-bold bg-primary text-white hover:bg-primary-light transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCurrentPlan("campeao") ? "Plano atual" : isPreparingCheckout === "campeao" ? "Preparando..." : "Preparar assinatura"}
              </button>
            )}
          </div>
        </div>

        {user && (
          <section className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Minha assinatura</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Dados reais da sua assinatura paga, atualizados pelo webhook do Asaas.
              </p>
            </div>

            {membershipLoading ? (
              <p className="text-sm text-muted-foreground">Carregando assinatura...</p>
            ) : membershipError ? (
              <p className="text-sm font-semibold text-accent">{membershipError}</p>
            ) : membership ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {(membership.status === "inactive_pending_webhook" || membership.status === "cancelled_at_period_end" || membership.status === "delete_requested") && (
                  <div className="rounded-xl border border-accent/60 bg-accent/15 p-4 text-foreground shadow-sm shadow-accent/10 sm:col-span-2 lg:col-span-4">
                    <p className="font-bold text-accent">
                      Cancelada, com acesso até {formatDate(membership.access_until || membership.ended_at)}.
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Plano</p>
                  <p className="mt-1 font-bold text-foreground">{getPlanName(membership.plan_type)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-1 font-bold text-foreground">{getMembershipStatusLabel(membership.status, membership.raw_status)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Provedor</p>
                  <p className="mt-1 font-bold text-foreground">Asaas</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Início</p>
                  <p className="mt-1 font-bold text-foreground">{formatDate(membership.started_at || membership.created_at)}</p>
                </div>
                {membership.access_until && (
                  <div className="rounded-xl bg-muted/40 p-4 sm:col-span-2">
                    <p className="text-muted-foreground">Acesso até</p>
                    <p className="mt-1 font-bold text-foreground">{formatDate(membership.access_until)}</p>
                  </div>
                )}
                <div className="rounded-xl bg-muted/40 p-4 sm:col-span-2 lg:col-span-4">
                  <p className="text-muted-foreground">Última atualização</p>
                  <p className="mt-1 font-bold text-foreground">{formatDate(membership.last_event_at || membership.created_at)}</p>
                </div>
                {isActiveMembership(membership.status) && (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      disabled={isCancellingSubscription}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCancellingSubscription ? "Solicitando cancelamento..." : "Cancelar assinatura"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não possui uma assinatura paga ativa.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
