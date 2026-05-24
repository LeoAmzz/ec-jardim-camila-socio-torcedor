import { NextResponse } from "next/server";
import { getAsaasWebhookToken } from "@/lib/asaas/config";
import type { AsaasWebhookEvent } from "@/lib/asaas/types";

function getWebhookToken(request: Request) {
  return (
    request.headers.get("asaas-access-token") ||
    request.headers.get("access_token") ||
    request.headers.get("x-asaas-webhook-token")
  );
}

export async function POST(request: Request) {
  const configuredToken = getAsaasWebhookToken();

  if (configuredToken) {
    const receivedToken = getWebhookToken(request);

    if (receivedToken !== configuredToken) {
      console.warn("Asaas webhook rejected: invalid token");
      return NextResponse.json({ received: false }, { status: 401 });
    }
  }

  let event: AsaasWebhookEvent = {};

  try {
    event = await request.json();
  } catch {
    console.info("Asaas webhook ignored: invalid JSON body");
    return NextResponse.json({ received: true, ignored: true });
  }

  console.info("Asaas webhook received", {
    event: event.event || "unknown",
    paymentId: event.payment?.id || null,
    subscriptionId: event.subscription?.id || event.payment?.subscription || null,
    paymentStatus: event.payment?.status || null,
    subscriptionStatus: event.subscription?.status || null,
  });

  return NextResponse.json({ received: true });
}
