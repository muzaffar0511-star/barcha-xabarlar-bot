export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function adminChatId() {
  return String(process.env.ADMIN_CHAT_ID || "166592957");
}
