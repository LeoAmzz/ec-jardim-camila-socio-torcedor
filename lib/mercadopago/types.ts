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
  status?: string;
  external_reference?: string | null;
  payer_email?: string;
}

export type MembershipStatus = "active" | "cancelled" | "pending";

export interface MercadoPagoWebhookEvent {
  id?: string | number;
  type?: string;
  topic?: string;
  action?: string;
  data?: {
    id?: string;
  };
}
