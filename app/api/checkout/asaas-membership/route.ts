import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAsaasApiKey, getAsaasBaseUrl } from "@/lib/asaas/config";
import type {
  AsaasCustomer,
  AsaasCustomerListResponse,
  AsaasMembershipCheckoutRequest,
  AsaasMembershipCheckoutResponse,
  AsaasPaymentListResponse,
  AsaasSubscription,
} from "@/lib/asaas/types";
import { getPlanByType, isPaidPlan } from "@/lib/plans";
import type { PlanType } from "@/lib/types/membership";

function getNextDueDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function sanitizeAsaasError(errorBody: unknown) {
  if (!errorBody || typeof errorBody !== "object") {
    return errorBody;
  }

  return JSON.parse(
    JSON.stringify(errorBody, (key, value) => {
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes("token") || lowerKey.includes("key") || lowerKey.includes("secret")) {
        return "[redacted]";
      }

      return value;
    })
  );
}

function createAsaasHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "User-Agent": "CamilaFC/1.0",
    access_token: apiKey,
  };
}

async function findOrCreateCustomer(params: {
  apiKey: string;
  baseUrl: string;
  email: string;
  name: string;
  userId: string;
}) {
  const headers = createAsaasHeaders(params.apiKey);
  const searchResponse = await fetch(`${params.baseUrl}/customers?email=${encodeURIComponent(params.email)}`, {
    headers,
  });
  const searchData = await searchResponse.json().catch(() => null) as AsaasCustomerListResponse | null;
  const existingCustomer = searchData?.data?.[0];

  if (existingCustomer?.id) {
    return existingCustomer;
  }

  const createResponse = await fetch(`${params.baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      externalReference: params.userId,
      notificationDisabled: false,
    }),
  });
  const customer = await createResponse.json().catch(() => null) as (AsaasCustomer & {
    errors?: unknown;
  }) | null;

  if (!createResponse.ok || !customer?.id) {
    console.error("Asaas customer creation failed", {
      status: createResponse.status,
      errorBody: sanitizeAsaasError(customer),
    });
    throw new Error("Não foi possível criar o cliente no Asaas.");
  }

  return customer;
}

async function getFirstSubscriptionPaymentUrl(params: {
  apiKey: string;
  baseUrl: string;
  subscriptionId: string;
}) {
  const response = await fetch(`${params.baseUrl}/subscriptions/${params.subscriptionId}/payments`, {
    headers: createAsaasHeaders(params.apiKey),
  });
  const data = await response.json().catch(() => null) as AsaasPaymentListResponse | null;
  const payment = data?.data?.[0];

  return payment?.invoiceUrl || payment?.bankSlipUrl || payment?.transactionReceiptUrl || null;
}

export async function POST(request: Request) {
  let body: Partial<AsaasMembershipCheckoutRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Envie um plano válido para continuar." }, { status: 400 });
  }

  const planType = body.planType as PlanType | undefined;

  if (!planType || !getPlanByType(planType)) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
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
    return NextResponse.json({ message: "Faça login para continuar." }, { status: 401 });
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
    return NextResponse.json({ message: "Plano inválido para checkout." }, { status: 400 });
  }

  let asaasApiKey: string;
  let asaasBaseUrl: string;

  try {
    asaasApiKey = getAsaasApiKey();
    asaasBaseUrl = getAsaasBaseUrl();
  } catch {
    return NextResponse.json(
      { message: "Checkout Asaas ainda não está configurado no servidor." },
      { status: 500 }
    );
  }

  const userMetadata = user.user_metadata;
  const customerName =
    typeof userMetadata?.full_name === "string" && userMetadata.full_name.trim()
      ? userMetadata.full_name
      : user.email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const customer = await findOrCreateCustomer({
      apiKey: asaasApiKey,
      baseUrl: asaasBaseUrl,
      email: user.email,
      name: customerName,
      userId: user.id,
    });
    const subscriptionResponse = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: createAsaasHeaders(asaasApiKey),
      body: JSON.stringify({
        customer: customer.id,
        billingType: "UNDEFINED",
        value: plan.price,
        nextDueDate: getNextDueDate(),
        cycle: "MONTHLY",
        description: `Plano ${plan.name} - E.C. Jardim Camila`,
        externalReference: JSON.stringify({
          provider: "asaas",
          user_id: user.id,
          plan_type: planType,
        }),
        ...(appUrl && {
          callback: {
            successUrl: `${appUrl}/planos?checkout=success`,
            autoRedirect: false,
          },
        }),
      }),
    });
    const subscription = await subscriptionResponse.json().catch(() => null) as (AsaasSubscription & {
      errors?: unknown;
    }) | null;

    if (!subscriptionResponse.ok || !subscription?.id) {
      console.error("Asaas subscription creation failed", {
        status: subscriptionResponse.status,
        planType,
        userId: user.id,
        errorBody: sanitizeAsaasError(subscription),
      });

      return NextResponse.json(
        { message: "Asaas rejeitou a criação da assinatura." },
        { status: 502 }
      );
    }

    const checkoutUrl =
      subscription.invoiceUrl ||
      subscription.paymentLink ||
      subscription.bankSlipUrl ||
      await getFirstSubscriptionPaymentUrl({
        apiKey: asaasApiKey,
        baseUrl: asaasBaseUrl,
        subscriptionId: subscription.id,
      });

    if (!checkoutUrl) {
      return NextResponse.json(
        { message: "Assinatura criada, mas o Asaas não retornou uma URL de pagamento." },
        { status: 502 }
      );
    }

    const response: AsaasMembershipCheckoutResponse = {
      message: "Checkout Asaas criado com sucesso.",
      checkout_url: checkoutUrl,
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      planType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Asaas checkout request failed", {
      planType,
      error: error instanceof Error ? error.message : "Unknown Asaas error",
    });

    return NextResponse.json(
      { message: "Não foi possível preparar a assinatura no Asaas agora." },
      { status: 502 }
    );
  }
}
