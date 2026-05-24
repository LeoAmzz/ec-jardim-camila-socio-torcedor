export function getAsaasApiKey() {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY is not configured.");
  }

  return apiKey;
}

export function getAsaasBaseUrl() {
  const environment = process.env.ASAAS_ENV || "sandbox";

  if (environment === "production") {
    return "https://api.asaas.com/v3";
  }

  return "https://sandbox.asaas.com/api/v3";
}

export function getAsaasWebhookToken() {
  return process.env.ASAAS_WEBHOOK_TOKEN || null;
}
