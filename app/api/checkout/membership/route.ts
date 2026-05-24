import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMercadoPagoAccessToken, getPublicAppUrl } from "@/lib/mercadopago/config";
import { getPlanByType, isPaidPlan } from "@/lib/plans";
import type { PlanType } from "@/lib/types/membership";
import type {
  MembershipCheckoutResponse,
  MembershipCheckoutRequest,
  MercadoPagoPreapprovalResponse,
} from "@/lib/mercadopago/types";

function isLocalUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function sanitizeMercadoPagoError(errorBody: unknown) {
  if (!errorBody || typeof errorBody !== "object") {
    return errorBody;
  }

  return JSON.parse(
    JSON.stringify(errorBody, (key, value) => {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes("token") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("access") ||
        lowerKey.includes("secret")
      ) {
        return "[redacted]";
      }

      return value;
    })
  );
}

export async function POST(request: Request) {
  let body: Partial<MembershipCheckoutRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Envie um plano válido para continuar." },
      { status: 400 }
    );
  }

  const planType = body.planType as PlanType | undefined;

  console.info("Membership checkout request received", {
    planType,
    hasMercadoPagoAccessToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
    hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  });

  if (!planType || !getPlanByType(planType)) {
    return NextResponse.json(
      { message: "Plano inválido." },
      { status: 400 }
    );
  }

  if (!isPaidPlan(planType)) {
    return NextResponse.json(
      { message: "O plano Torcedor é gratuito e não precisa de checkout." },
      { status: 400 }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "").trim()
    : null;

  if (!accessToken) {
    return NextResponse.json(
      { message: "Faça login para continuar." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { message: "Configuração do Supabase ausente no servidor." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user?.email) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada. Faça login novamente." },
      { status: 401 }
    );
  }

  const plan = getPlanByType(planType);

  if (!plan || !isPaidPlan(plan.type)) {
    return NextResponse.json(
      { message: "Plano inválido para checkout." },
      { status: 400 }
    );
  }

  let mercadoPagoAccessToken: string;
  let appUrl: string;

  try {
    mercadoPagoAccessToken = getMercadoPagoAccessToken();
    appUrl = getPublicAppUrl();
  } catch {
    return NextResponse.json(
      { message: "Checkout ainda não está configurado no servidor." },
      { status: 500 }
    );
  }

  const mercadoPagoEnv = process.env.MERCADO_PAGO_ENV;
  const isTestCredential = mercadoPagoAccessToken.startsWith("TEST");
  const isMercadoPagoTestMode = mercadoPagoEnv === "test" || isTestCredential;
  const payerEmail = isMercadoPagoTestMode
    ? process.env.MERCADO_PAGO_TEST_PAYER_EMAIL
    : user.email;

  if (!payerEmail) {
    return NextResponse.json(
      { message: "MERCADO_PAGO_TEST_PAYER_EMAIL não configurado." },
      { status: 500 }
    );
  }

  const reason = `Plano ${plan.name} - E.C. Jardim Camila`;
  const isLocalAppUrl = isLocalUrl(appUrl);
  const preapprovalPayload = {
    reason,
    payer_email: payerEmail,
    external_reference: JSON.stringify({
      origin: "membership",
      user_id: user.id,
      plan_type: planType,
    }),
    back_url: `${appUrl}/planos?checkout=success`,
    ...(!isLocalAppUrl && {
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    }),
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: plan.price,
      currency_id: "BRL",
    },
  };

  console.info("Creating Mercado Pago preapproval", {
    planType,
    hasMercadoPagoAccessToken: Boolean(mercadoPagoAccessToken),
    isMercadoPagoTestMode,
    isTestCredential,
    mercadoPagoEnv: mercadoPagoEnv || "unset",
    payerEmailMode: isMercadoPagoTestMode ? "test" : "real",
    hasTestPayerEmail: Boolean(process.env.MERCADO_PAGO_TEST_PAYER_EMAIL),
    hasAppUrl: Boolean(appUrl),
    isLocalAppUrl,
    hasStageHeader: isTestCredential,
    sendsBackUrl: Boolean(preapprovalPayload.back_url),
    sendsNotificationUrl: "notification_url" in preapprovalPayload,
  });

  let mercadoPagoResponse: Response;
  const mercadoPagoHeaders: Record<string, string> = {
    Authorization: `Bearer ${mercadoPagoAccessToken}`,
    "Content-Type": "application/json",
  };

  if (isTestCredential) {
    mercadoPagoHeaders["X-scope"] = "stage";
  }

  try {
    mercadoPagoResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: mercadoPagoHeaders,
      body: JSON.stringify(preapprovalPayload),
    });
  } catch (error) {
    console.error("Mercado Pago checkout request failed before response", {
      planType,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    });

    return NextResponse.json(
      { message: "Não foi possível conectar ao Mercado Pago agora." },
      { status: 502 }
    );
  }

  const mercadoPagoData = await mercadoPagoResponse.json().catch(() => null) as (MercadoPagoPreapprovalResponse & {
    message?: string;
    error?: string;
    cause?: unknown;
  }) | null;
  const checkoutUrl = mercadoPagoData?.init_point || mercadoPagoData?.sandbox_init_point;

  console.info("Mercado Pago preapproval response", {
    planType,
    status: mercadoPagoResponse.status,
    hasCheckoutUrl: Boolean(checkoutUrl),
    mercadoPagoId: mercadoPagoData?.id || null,
  });

  if (!mercadoPagoResponse.ok || !checkoutUrl || !mercadoPagoData?.id) {
    console.error("Mercado Pago checkout creation failed", {
      status: mercadoPagoResponse.status,
      planType,
      userId: user.id,
      errorBody: sanitizeMercadoPagoError(mercadoPagoData),
    });

    const mercadoPagoMessage = mercadoPagoData?.message || mercadoPagoData?.error;

    return NextResponse.json(
      {
        message: mercadoPagoMessage
          ? `Mercado Pago rejeitou a requisição: ${mercadoPagoMessage}`
          : "Mercado Pago rejeitou a requisição de checkout.",
      },
      { status: 502 }
    );
  }

  const response: MembershipCheckoutResponse = {
    message: "Checkout Mercado Pago criado com sucesso.",
    checkout_url: checkoutUrl,
    mercado_pago_id: mercadoPagoData.id,
    planType,
  };

  return NextResponse.json(response);
}
