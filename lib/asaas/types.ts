import type { PaidPlanType } from "@/lib/types/membership";

export interface AsaasMembershipCheckoutRequest {
  planType: PaidPlanType;
}

export interface AsaasMembershipCheckoutResponse {
  message: string;
  planType: PaidPlanType;
  checkout_url?: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
}

export interface AsaasCustomer {
  id: string;
  name?: string;
  email?: string;
}

export interface AsaasCustomerListResponse {
  data?: AsaasCustomer[];
}

export interface AsaasSubscription {
  id: string;
  status?: string;
  description?: string;
  value?: number;
  externalReference?: string;
  invoiceUrl?: string;
  paymentLink?: string;
  bankSlipUrl?: string;
}

export interface AsaasPayment {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
}

export interface AsaasPaymentListResponse {
  data?: AsaasPayment[];
}

export interface AsaasWebhookEvent {
  event?: string;
  payment?: {
    id?: string;
    customer?: string;
    subscription?: string;
    status?: string;
    value?: number;
    invoiceUrl?: string;
    externalReference?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
    externalReference?: string;
  };
}
