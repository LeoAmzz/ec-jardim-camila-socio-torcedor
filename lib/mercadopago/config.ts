export function getMercadoPagoAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
  }

  return accessToken;
}

export function getMercadoPagoWebhookSecret() {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("MERCADO_PAGO_WEBHOOK_SECRET is not configured.");
  }

  return webhookSecret;
}

export function getPublicAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  return appUrl;
}
