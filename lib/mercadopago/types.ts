import type { PaidPlanType } from "@/lib/types/membership";

export interface MembershipCheckoutRequest {
  planType: PaidPlanType;
}

export interface MembershipCheckoutResponse {
  message: string;
  planType: PaidPlanType;
  checkout_url?: string;
  mercado_pago_id?: string;
}

export interface MercadoPagoPreapprovalResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}
