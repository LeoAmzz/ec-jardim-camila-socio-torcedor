import { NextResponse } from "next/server";
import { getAsaasApiKey, getAsaasBaseUrl, getAsaasWebhookToken } from "@/lib/asaas/config";
import type { AsaasSubscription, AsaasWebhookEvent } from "@/lib/asaas/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaidPlanType } from "@/lib/types/membership";

const PLAN_ACTIVATION_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const IGNORED_PAYMENT_EVENTS = new Set([
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
]);

type MembershipReference = {
  user_id?: string;
  plan_type?: string;
  provider?: string;
};

function getWebhookToken(request: Request) {
  return request.headers.get("asaas-access-token");
}

function createAsaasHeaders(apiKey: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "User-Agent": "CamilaFC/1.0",
    access_token: apiKey,
  };
}

function isPaidPlanType(planType: unknown): planType is PaidPlanType {
  return planType === "camisa" || planType === "campeao";
}

function parseExternalReference(externalReference?: string | null): MembershipReference | null {
  if (!externalReference) {
    return null;
  }

  try {
    const parsed = JSON.parse(externalReference) as MembershipReference;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    console.warn("Asaas webhook ignored: invalid externalReference JSON");
    return null;
  }
}

async function fetchAsaasSubscription(subscriptionId: string) {
  const apiKey = getAsaasApiKey();
  const baseUrl = getAsaasBaseUrl();
  const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
    headers: createAsaasHeaders(apiKey),
  });
  const subscription = await response.json().catch(() => null) as AsaasSubscription | null;

  if (!response.ok || !subscription?.id) {
    console.error("Asaas subscription lookup failed", {
      endpoint: "/subscriptions/{id}",
      status: response.status,
      subscriptionId,
    });
    return null;
  }

  return subscription;
}

async function resolveExternalReference(event: AsaasWebhookEvent) {
  const paymentReference = parseExternalReference(event.payment?.externalReference);

  if (paymentReference) {
    return paymentReference;
  }

  const subscriptionReference = parseExternalReference(event.subscription?.externalReference);

  if (subscriptionReference) {
    return subscriptionReference;
  }

  const subscriptionId = event.payment?.subscription || event.subscription?.id;

  if (!subscriptionId) {
    return null;
  }

  const subscription = await fetchAsaasSubscription(subscriptionId);
  return parseExternalReference(subscription?.externalReference);
}

async function activateMembership(params: {
  userId: string;
  planType: PaidPlanType;
  subscriptionId: string;
  rawStatus?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("started_at")
    .eq("provider_subscription_id", params.subscriptionId)
    .maybeSingle();

  const { error: membershipError } = await supabase
    .from("memberships")
    .upsert(
      {
        user_id: params.userId,
        plan_type: params.planType,
        provider: "asaas",
        provider_subscription_id: params.subscriptionId,
        status: "active",
        raw_status: params.rawStatus || null,
        started_at: existingMembership?.started_at || now,
        ended_at: null,
        last_event_at: now,
      },
      { onConflict: "provider_subscription_id" }
    );

  if (membershipError) {
    throw new Error(`membership_upsert_failed: ${membershipError.message}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      plan_type: params.planType,
      updated_at: now,
    })
    .eq("id", params.userId);

  if (profileError) {
    throw new Error(`profile_update_failed: ${profileError.message}`);
  }
}

export async function POST(request: Request) {
  const configuredToken = getAsaasWebhookToken();
  const asaasEnv = process.env.ASAAS_ENV || "sandbox";

  if (configuredToken) {
    const receivedToken = getWebhookToken(request);

    if (receivedToken !== configuredToken) {
      console.warn("Asaas webhook rejected: invalid token");
      return NextResponse.json({ received: false }, { status: 401 });
    }
  } else if (asaasEnv === "sandbox") {
    console.warn("Asaas webhook running without ASAAS_WEBHOOK_TOKEN in sandbox.");
  } else {
    console.warn("Asaas webhook rejected: ASAAS_WEBHOOK_TOKEN is not configured.");
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event: AsaasWebhookEvent = {};

  try {
    event = await request.json();
  } catch {
    console.info("Asaas webhook ignored: invalid JSON body");
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventName = event.event || "unknown";
  const subscriptionId = event.payment?.subscription || event.subscription?.id || null;

  console.info("Asaas webhook received", {
    event: eventName,
    paymentId: event.payment?.id || null,
    subscriptionId,
    paymentStatus: event.payment?.status || null,
    paymentValue: event.payment?.value || null,
  });

  if (!PLAN_ACTIVATION_EVENTS.has(eventName)) {
    if (IGNORED_PAYMENT_EVENTS.has(eventName) || eventName.startsWith("SUBSCRIPTION_")) {
      console.info("Asaas webhook ignored safely", {
        event: eventName,
        paymentId: event.payment?.id || null,
        subscriptionId,
      });
    }

    return NextResponse.json({ received: true, ignored: true });
  }

  if (!subscriptionId) {
    console.warn("Asaas webhook ignored: missing subscription id", {
      event: eventName,
      paymentId: event.payment?.id || null,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const reference = await resolveExternalReference(event);

  if (!reference?.user_id || !isPaidPlanType(reference.plan_type)) {
    console.warn("Asaas webhook ignored: invalid membership reference", {
      event: eventName,
      paymentId: event.payment?.id || null,
      subscriptionId,
      hasUserId: Boolean(reference?.user_id),
      planType: reference?.plan_type || null,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  if (reference.provider && reference.provider !== "asaas") {
    console.warn("Asaas webhook ignored: invalid provider reference", {
      event: eventName,
      paymentId: event.payment?.id || null,
      subscriptionId,
      provider: reference.provider,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await activateMembership({
      userId: reference.user_id,
      planType: reference.plan_type,
      subscriptionId,
      rawStatus: event.payment?.status || event.subscription?.status || null,
    });

    console.info("Asaas membership activated", {
      event: eventName,
      paymentId: event.payment?.id || null,
      subscriptionId,
      userId: reference.user_id,
      planType: reference.plan_type,
    });

    return NextResponse.json({ received: true, updated: true });
  } catch (error) {
    console.error("Asaas webhook update failed", {
      event: eventName,
      paymentId: event.payment?.id || null,
      subscriptionId,
      userId: reference.user_id,
      planType: reference.plan_type,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ received: false }, { status: 500 });
  }
}
