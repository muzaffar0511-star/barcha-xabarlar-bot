import { required } from "./config.js";

export async function telegram(method, payload = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${required("TELEGRAM_BOT_TOKEN")}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

export function messageType(message) {
  const types = [
    "photo", "voice", "video", "audio", "document", "animation",
    "sticker", "location", "contact", "poll"
  ];
  return types.find((type) => message[type]) || "xabar";
}

export function userName(user = {}) {
  return [user.first_name || "", user.last_name || ""].join(" ").trim() || "Noma’lum foydalanuvchi";
}
