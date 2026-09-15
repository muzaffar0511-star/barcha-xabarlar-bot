const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const publicUrl = process.env.PUBLIC_URL;

if (!token || !secret || !publicUrl) {
  throw new Error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET va PUBLIC_URL kerak.");
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${publicUrl.replace(/\/$/, "")}/api/webhook`,
    secret_token: secret,
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
});

console.log(await response.text());
