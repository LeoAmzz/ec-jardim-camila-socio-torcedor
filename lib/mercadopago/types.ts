import type { PaidPlanType } from "@/lib/types/membership";

export interface MembershipCheckoutRequest {
  planType: PaidPlanType;
}

export interface MembershipCheckoutPlaceholderResponse {
  message: string;
  planType: PaidPlanType;
}
