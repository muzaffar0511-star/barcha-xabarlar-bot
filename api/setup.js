import { required } from "../lib/config.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ ok: false });
  if (request.query.key !== required("SETUP_SECRET")) {
    return response.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const webhookUrl = `https://${host}/api/webhook`;
  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${required("TELEGRAM_BOT_TOKEN")}/setWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: required("TELEGRAM_WEBHOOK_SECRET"),
        allowed_updates: [
          "message",
          "callback_query",
          "business_connection",
          "business_message",
          "edited_business_message",
          "deleted_business_messages"
        ],
        drop_pending_updates: false
      })
    }
  );
  const result = await telegramResponse.json();
  return response.status(result.ok ? 200 : 502).json({
    ok: Boolean(result.ok),
    webhook_url: webhookUrl,
    description: result.description || "Webhook o‘rnatildi."
  });
}
