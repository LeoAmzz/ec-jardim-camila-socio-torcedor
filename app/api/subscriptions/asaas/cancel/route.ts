import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAsaasApiKey, getAsaasBaseUrl } from "@/lib/asaas/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Membership = {
  id: string;
  provider_subscription_id: string | null;
  status: string;
  started_at: string | null;
  access_until: string | null;
};

type AsaasErrorBody = {
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

type AsaasSubscription = AsaasErrorBody & {
  id?: string;
  nextDueDate?: string;
};

function createAsaasHeaders(apiKey: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "User-Agent": "CamilaFC/1.0",
    access_token: apiKey,
  };
}

function getPrimaryAsaasErrorDescription(errorBody: AsaasErrorBody | null) {
  return errorBody?.errors?.find((error) => error.description)?.description;
}

function getAsaasErrorDescriptions(errorBody: AsaasErrorBody | null) {
  return errorBody?.errors?.map((error) => ({
    code: error.code,
    description: error.description,
  })) || [];
}

function isInvalidActionError(errorBody: AsaasErrorBody | null) {
  return Boolean(
    errorBody?.errors?.some((error) => {
      const code = error.code?.toLowerCase() || "";
      const description = error.description?.toLowerCase() || "";

      return code === "invalid_action" || description.includes("não pode ser atualizada");
    })
  );
}

function getFutureIsoDate(date?: string | null) {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return null;
  }

  return parsed.toISOString();
}

function getOneMonthFromDateIso(date?: string | null) {
  const baseDate = date ? new Date(date) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    baseDate.setTime(Date.now());
  }

  baseDate.setMonth(baseDate.getMonth() + 1);
  return baseDate.toISOString();
}

async function getSubscriptionAccessUntil(params: {
  apiKey: string;
  baseUrl: string;
  subscriptionId: string;
}) {
  const response = await fetch(`${params.baseUrl}/subscriptions/${params.subscriptionId}`, {
    headers: createAsaasHeaders(params.apiKey),
  });
  const subscription = await response.json().catch(() => null) as AsaasSubscription | null;

  if (!response.ok) {
    console.warn("Asaas subscription lookup before cancellation failed", {
      subscriptionId: params.subscriptionId,
      status: response.status,
      errors: getAsaasErrorDescriptions(subscription),
    });
    return null;
  }

  return getFutureIsoDate(subscription?.nextDueDate);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "").trim()
    : null;

  if (!accessToken) {
    return NextResponse.json({ message: "Faça login para cancelar sua assinatura." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { message: "Configuração do Supabase ausente no servidor." },
      { status: 500 }
    );
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada. Faça login novamente." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("memberships")
    .select("id,provider_subscription_id,status,started_at,access_until")
    .eq("user_id", user.id)
    .eq("provider", "asaas")
    .in("status", ["active", "confirmed", "received"])
    .not("provider_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Membership>();

  if (membershipError) {
    console.error("Asaas cancellation membership lookup failed", {
      userId: user.id,
      error: membershipError.message,
    });
    return NextResponse.json(
      { message: "Não foi possível localizar sua assinatura agora." },
      { status: 500 }
    );
  }

  if (!membership?.provider_subscription_id) {
    return NextResponse.json(
      { message: "Nenhuma assinatura ativa encontrada." },
      { status: 404 }
    );
  }

  let asaasApiKey: string;
  let asaasBaseUrl: string;

  try {
    asaasApiKey = getAsaasApiKey();
    asaasBaseUrl = getAsaasBaseUrl();
  } catch {
    return NextResponse.json(
      { message: "Cancelamento Asaas ainda não está configurado no servidor." },
      { status: 500 }
    );
  }

  const subscriptionUrl = `${asaasBaseUrl}/subscriptions/${membership.provider_subscription_id}`;
  const accessUntil = await getSubscriptionAccessUntil({
    apiKey: asaasApiKey,
    baseUrl: asaasBaseUrl,
    subscriptionId: membership.provider_subscription_id,
  }) || getFutureIsoDate(membership.access_until) || getOneMonthFromDateIso(membership.started_at);
  const now = new Date().toISOString();
  const { error: pendingUpdateError } = await supabaseAdmin
    .from("memberships")
    .update({
      status: "inactive_pending_webhook",
      raw_status: "INACTIVE_REQUESTED",
      access_until: accessUntil,
      ended_at: accessUntil,
      last_event_at: now,
    })
    .eq("id", membership.id)
    .eq("user_id", user.id);

  if (pendingUpdateError) {
    console.error("Asaas cancellation pre-update failed", {
      userId: user.id,
      subscriptionId: membership.provider_subscription_id,
      error: pendingUpdateError.message,
    });
  }

  const cancelResponse = await fetch(subscriptionUrl, {
    method: "PUT",
    headers: createAsaasHeaders(asaasApiKey),
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  const cancelData = await cancelResponse.json().catch(() => null) as AsaasErrorBody | null;
  let requestStatus = "inactive_pending_webhook";
  let rawStatus = "INACTIVE";
  let cancellationStatus = cancelResponse.status;

  if (!cancelResponse.ok && isInvalidActionError(cancelData)) {
    console.warn("Asaas subscription inactive update rejected, trying delete fallback", {
      userId: user.id,
      subscriptionId: membership.provider_subscription_id,
      status: cancelResponse.status,
      errors: getAsaasErrorDescriptions(cancelData),
    });

    const deleteResponse = await fetch(subscriptionUrl, {
      method: "DELETE",
      headers: createAsaasHeaders(asaasApiKey),
    });
    const deleteData = await deleteResponse.json().catch(() => null) as AsaasErrorBody | null;
    cancellationStatus = deleteResponse.status;

    if (!deleteResponse.ok) {
      console.error("Asaas subscription delete fallback failed", {
        userId: user.id,
        subscriptionId: membership.provider_subscription_id,
        status: deleteResponse.status,
        errors: getAsaasErrorDescriptions(deleteData),
      });

      return NextResponse.json(
        {
          message: getPrimaryAsaasErrorDescription(deleteData)
            ? `Asaas rejeitou o cancelamento: ${getPrimaryAsaasErrorDescription(deleteData)}`
            : "Asaas rejeitou o cancelamento da assinatura.",
        },
        { status: 502 }
      );
    }

    requestStatus = "delete_requested";
    rawStatus = "DELETE_REQUESTED";
  }

  if (!cancelResponse.ok && requestStatus !== "delete_requested") {
    console.error("Asaas subscription cancellation failed", {
      userId: user.id,
      subscriptionId: membership.provider_subscription_id,
      status: cancelResponse.status,
      errors: getAsaasErrorDescriptions(cancelData),
    });

    return NextResponse.json(
      {
        message: getPrimaryAsaasErrorDescription(cancelData)
          ? `Asaas rejeitou o cancelamento: ${getPrimaryAsaasErrorDescription(cancelData)}`
          : "Asaas rejeitou o cancelamento da assinatura.",
      },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("memberships")
    .update({
      status: requestStatus,
      raw_status: rawStatus,
      access_until: accessUntil,
      ended_at: accessUntil,
      last_event_at: now,
    })
    .eq("id", membership.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Asaas cancellation pending status update failed", {
      userId: user.id,
      subscriptionId: membership.provider_subscription_id,
      error: updateError.message,
    });
  }

  console.info("Asaas subscription cancellation requested", {
    userId: user.id,
    subscriptionId: membership.provider_subscription_id,
    status: cancellationStatus,
    requestStatus,
    accessUntil,
  });

  return NextResponse.json({
    message: "Solicitação de cancelamento enviada. Aguarde a confirmação.",
  });
}
