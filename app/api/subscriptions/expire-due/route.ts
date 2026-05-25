import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ExpiringMembership = {
  id: string;
  user_id: string;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const receivedToken = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "").trim()
    : null;

  return Boolean(cronSecret && receivedToken && receivedToken === cronSecret);
}

async function expireDueMemberships(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: memberships, error: listError } = await supabase
    .from("memberships")
    .select("id,user_id")
    .eq("provider", "asaas")
    .eq("status", "cancelled_at_period_end")
    .lte("access_until", now)
    .returns<ExpiringMembership[]>();

  if (listError) {
    console.error("Membership expiration lookup failed", {
      error: listError.message,
    });
    return NextResponse.json(
      { ok: false, message: "Não foi possível buscar assinaturas expiradas." },
      { status: 500 }
    );
  }

  let expiredCount = 0;

  for (const membership of memberships || []) {
    const { error: membershipError } = await supabase
      .from("memberships")
      .update({
        status: "cancelled",
        ended_at: now,
        last_event_at: now,
      })
      .eq("id", membership.id);

    if (membershipError) {
      console.error("Membership expiration update failed", {
        membershipId: membership.id,
        userId: membership.user_id,
        error: membershipError.message,
      });
      continue;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        plan_type: "torcedor",
        updated_at: now,
      })
      .eq("id", membership.user_id);

    if (profileError) {
      console.error("Profile expiration downgrade failed", {
        membershipId: membership.id,
        userId: membership.user_id,
        error: profileError.message,
      });
      continue;
    }

    expiredCount += 1;
  }

  return NextResponse.json({
    ok: true,
    expired: expiredCount,
  });
}

export async function POST(request: Request) {
  return expireDueMemberships(request);
}

export async function GET(request: Request) {
  return expireDueMemberships(request);
}
