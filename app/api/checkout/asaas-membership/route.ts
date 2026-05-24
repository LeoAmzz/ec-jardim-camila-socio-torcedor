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

type AsaasErrorBody = {
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

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

function getAsaasErrorDescriptions(errorBody: AsaasErrorBody | null) {
  return errorBody?.errors?.map((error) => ({
    code: error.code,
    description: error.description,
  })) || [];
}

function getPrimaryAsaasErrorDescription(errorBody: AsaasErrorBody | null) {
  return errorBody?.errors?.find((error) => error.description)?.description;
}

function createAsaasHeaders(apiKey: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
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
  cpfCnpj: string;
}) {
  const headers = createAsaasHeaders(params.apiKey);
  const searchResponse = await fetch(`${params.baseUrl}/customers?email=${encodeURIComponent(params.email)}`, {
    headers,
  });
  const searchData = await searchResponse.json().catch(() => null) as AsaasCustomerListResponse | null;
  const existingCustomer = searchData?.data?.[0];

  if (existingCustomer?.id) {
    const updateResponse = await fetch(`${params.baseUrl}/customers/${existingCustomer.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: existingCustomer.name || params.name,
        email: existingCustomer.email || params.email,
        cpfCnpj: params.cpfCnpj,
        externalReference: params.userId,
      }),
    });
    const updatedCustomer = await updateResponse.json().catch(() => null) as (AsaasCustomer & AsaasErrorBody) | null;

    if (!updateResponse.ok || !updatedCustomer?.id) {
      console.error("Asaas customer update failed", {
        endpoint: "/customers/{id}",
        status: updateResponse.status,
        errors: getAsaasErrorDescriptions(updatedCustomer),
        errorBody: sanitizeAsaasError(updatedCustomer),
      });
      throw new Error(getPrimaryAsaasErrorDescription(updatedCustomer) || "Não foi possível atualizar o CPF/CNPJ do cliente no Asaas.");
    }

    return updatedCustomer;
  }

  const createResponse = await fetch(`${params.baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      cpfCnpj: params.cpfCnpj,
      externalReference: params.userId,
      notificationDisabled: false,
    }),
  });
  const customer = await createResponse.json().catch(() => null) as (AsaasCustomer & AsaasErrorBody) | null;

  if (!createResponse.ok || !customer?.id) {
    console.error("Asaas customer creation failed", {
      endpoint: "/customers",
      status: createResponse.status,
      errors: getAsaasErrorDescriptions(customer),
      errorBody: sanitizeAsaasError(customer),
    });
    throw new Error(getPrimaryAsaasErrorDescription(customer) || "Não foi possível criar o cliente no Asaas.");
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
  const asaasEnv = process.env.ASAAS_ENV || "sandbox";

  try {
    asaasApiKey = getAsaasApiKey();
    asaasBaseUrl = getAsaasBaseUrl();
  } catch {
    return NextResponse.json(
      { message: "Checkout Asaas ainda não está configurado no servidor." },
      { status: 500 }
    );
  }

  if (asaasEnv === "sandbox" && !asaasApiKey.startsWith("$aact_hmlg_")) {
    return NextResponse.json(
      { message: "A chave Asaas não parece ser de sandbox." },
      { status: 500 }
    );
  }

  if (asaasEnv === "production" && !asaasApiKey.startsWith("$aact_prod_")) {
    return NextResponse.json(
      { message: "A chave Asaas não parece ser de produção." },
      { status: 500 }
    );
  }

  const userMetadata = user.user_metadata;
  const customerName =
    typeof userMetadata?.full_name === "string" && userMetadata.full_name.trim()
      ? userMetadata.full_name
      : user.email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cpfCnpj = asaasEnv === "sandbox"
    ? process.env.ASAAS_TEST_CUSTOMER_CPF_CNPJ
    : null;

  if (asaasEnv === "sandbox" && !cpfCnpj) {
    return NextResponse.json(
      { message: "Configure ASAAS_TEST_CUSTOMER_CPF_CNPJ para testar no sandbox." },
      { status: 500 }
    );
  }

  if (asaasEnv === "production") {
    return NextResponse.json(
      { message: "Para assinar, será necessário informar CPF/CNPJ." },
      { status: 400 }
    );
  }

  if (!cpfCnpj) {
    return NextResponse.json(
      { message: "Configure ASAAS_TEST_CUSTOMER_CPF_CNPJ para testar no sandbox." },
      { status: 500 }
    );
  }

  try {
    const customer = await findOrCreateCustomer({
      apiKey: asaasApiKey,
      baseUrl: asaasBaseUrl,
      email: user.email,
      name: customerName,
      userId: user.id,
      cpfCnpj,
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
    const subscription = await subscriptionResponse.json().catch(() => null) as (AsaasSubscription & AsaasErrorBody) | null;

    if (!subscriptionResponse.ok || !subscription?.id) {
      console.error("Asaas subscription creation failed", {
        endpoint: "/subscriptions",
        status: subscriptionResponse.status,
        planType,
        userId: user.id,
        errors: getAsaasErrorDescriptions(subscription),
        errorBody: sanitizeAsaasError(subscription),
      });

      return NextResponse.json(
        {
          message: getPrimaryAsaasErrorDescription(subscription)
            ? `Asaas rejeitou: ${getPrimaryAsaasErrorDescription(subscription)}`
            : "Asaas rejeitou a criação da assinatura.",
        },
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
      { message: error instanceof Error ? `Asaas rejeitou: ${error.message}` : "Não foi possível preparar a assinatura no Asaas agora." },
      { status: 502 }
    );
  }
}
