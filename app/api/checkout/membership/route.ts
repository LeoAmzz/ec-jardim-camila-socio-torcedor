import { NextResponse } from "next/server";
import { getPlanByType, isPaidPlan } from "@/lib/plans";
import type { PlanType } from "@/lib/types/membership";
import type {
  MembershipCheckoutPlaceholderResponse,
  MembershipCheckoutRequest,
} from "@/lib/mercadopago/types";

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

  const response: MembershipCheckoutPlaceholderResponse = {
    message: "Checkout Mercado Pago será ativado na próxima fase",
    planType,
  };

  return NextResponse.json(response);
}
