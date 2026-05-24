import { NextResponse } from "next/server";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago/config";
import type {
  MembershipStatus,
  MercadoPagoPreapprovalResponse,
  MercadoPagoWebhookEvent,
} from "@/lib/mercadopago/types";
import { isPaidPlan } from "@/lib/plans";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaidPlanType, PlanType } from "@/lib/types/membership";

const ACTIVE_STATUSES = new Set(["authorized", "active", "approved"]);
const CANCELLED_STATUSES = new Set(["cancelled", "paused", "inactive", "rejected"]);
const PENDING_STATUSES = new Set(["pending", "in_process"]);

function getEventType(event: MercadoPagoWebhookEvent) {
  return event.type || event.topic || event.action || "unknown";
}

function getPreapprovalId(event: MercadoPagoWebhookEvent, requestUrl: string) {
  const url = new URL(requestUrl);

  return (
    event.data?.id ||
    (typeof event.id === "string" ? event.id : undefined) ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    undefined
  );
}

function isPreapprovalEvent(eventType: string) {
  return eventType.toLowerCase().includes("preapproval");
}

function parseExternalReference(externalReference: string | null | undefined) {
  if (!externalReference) {
    return null;
  }

  try {
    const parsed = JSON.parse(externalReference) as {
      origin?: string;
      user_id?: string;
      plan_type?: string;
    };

    if (
      parsed.origin === "membership" &&
      parsed.user_id &&
      parsed.plan_type &&
      isPaidPlan(parsed.plan_type as PlanType)
    ) {
      return {
        userId: parsed.user_id,
        planType: parsed.plan_type as PaidPlanType,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeMembershipStatus(rawStatus: string | undefined): MembershipStatus | null {
  if (!rawStatus) {
    return null;
  }

  if (ACTIVE_STATUSES.has(rawStatus)) {
    return "active";
  }

  if (CANCELLED_STATUSES.has(rawStatus)) {
    return "cancelled";
  }

  if (PENDING_STATUSES.has(rawStatus)) {
    return "pending";
  }

  return null;
}

export async function POST(request: Request) {
  let event: MercadoPagoWebhookEvent = {};

  try {
    event = await request.json();
  } catch {
    console.info("Mercado Pago webhook ignored: invalid JSON body");
    return NextResponse.json({ received: true });
  }

  const eventType = getEventType(event);
  const preapprovalId = getPreapprovalId(event, request.url);

  console.info("Mercado Pago webhook received", {
    eventType,
    preapprovalId,
    hasSignatureHeader: Boolean(request.headers.get("x-signature")),
  });

  // TODO: validar x-signature usando MERCADO_PAGO_WEBHOOK_SECRET quando o formato final
  // dos headers estiver confirmado no painel Mercado Pago. Ainda assim, nunca atualizamos
  // plano sem consultar o Mercado Pago pelo ID recebido.
  if (!isPreapprovalEvent(eventType) || !preapprovalId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let mercadoPagoAccessToken: string;

  try {
    mercadoPagoAccessToken = getMercadoPagoAccessToken();
  } catch {
    console.error("Mercado Pago webhook failed: missing access token");
    return NextResponse.json({ received: true, ignored: true });
  }

  let mercadoPagoResponse: Response;

  try {
    mercadoPagoResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
    });
  } catch (error) {
    console.error("Mercado Pago webhook failed: preapproval lookup request error", {
      preapprovalId,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    });
    return NextResponse.json({ received: true, ignored: true });
  }
  const preapproval = await mercadoPagoResponse.json().catch(() => null) as MercadoPagoPreapprovalResponse | null;

  console.info("Mercado Pago preapproval checked", {
    preapprovalId,
    status: preapproval?.status || null,
    httpStatus: mercadoPagoResponse.status,
  });

  if (!mercadoPagoResponse.ok || !preapproval?.id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const externalReference = parseExternalReference(preapproval.external_reference);
  const normalizedStatus = normalizeMembershipStatus(preapproval.status);

  if (!externalReference || !normalizedStatus) {
    console.info("Mercado Pago webhook ignored: invalid reference or status", {
      preapprovalId,
      status: preapproval.status || null,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  let supabase;

  try {
    supabase = getSupabaseAdminClient();
  } catch {
    console.error("Mercado Pago webhook failed: missing Supabase admin config");
    return NextResponse.json({ received: true, ignored: true });
  }

  const now = new Date().toISOString();
  const endedAt = normalizedStatus === "cancelled" ? now : null;
  const startedAt = normalizedStatus === "active" ? now : null;

  const { error: membershipError } = await supabase
    .from("memberships")
    .upsert(
      {
        user_id: externalReference.userId,
        plan_type: externalReference.planType,
        provider: "mercado_pago",
        provider_subscription_id: preapproval.id,
        status: normalizedStatus,
        raw_status: preapproval.status || null,
        last_event_at: now,
        ...(startedAt && { started_at: startedAt }),
        ...(endedAt && { ended_at: endedAt }),
      },
      { onConflict: "provider_subscription_id" }
    );

  if (membershipError) {
    console.error("Mercado Pago webhook failed: membership upsert error", {
      preapprovalId,
      code: membershipError.code,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  if (normalizedStatus === "active") {
    await supabase
      .from("profiles")
      .update({ plan_type: externalReference.planType })
      .eq("id", externalReference.userId);
  }

  if (normalizedStatus === "cancelled") {
    await supabase
      .from("profiles")
      .update({ plan_type: "torcedor" })
      .eq("id", externalReference.userId);
  }

  return NextResponse.json({
    received: true,
    status: normalizedStatus,
  });
}
