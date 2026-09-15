import { required } from "./config.js";

function valueBySuffix(suffix) {
  const key = Object.keys(process.env).find(
    (name) => name === suffix || name.endsWith(`_${suffix}`)
  );
  return key ? process.env[key] : "";
}

function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL
    || valueBySuffix("KV_REST_API_URL")
    || required("KV_REST_API_URL");
}

function redisToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN
    || valueBySuffix("KV_REST_API_TOKEN")
    || required("KV_REST_API_TOKEN");
}

export async function command(...args) {
  const response = await fetch(redisUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${redisToken()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(args)
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "Redis request failed");
  return data.result;
}

export async function getJson(key) {
  const value = await command("GET", key);
  return value ? JSON.parse(value) : null;
}

export async function setJson(key, value, ttlSeconds) {
  const args = ["SET", key, JSON.stringify(value)];
  if (ttlSeconds) args.push("EX", String(ttlSeconds));
  return command(...args);
}

export async function setText(key, value, ttlSeconds) {
  const args = ["SET", key, String(value)];
  if (ttlSeconds) args.push("EX", String(ttlSeconds));
  return command(...args);
}

export async function del(key) {
  return command("DEL", key);
}

export async function once(key, ttlSeconds = 86400) {
  return (await command("SET", key, "1", "EX", String(ttlSeconds), "NX")) === "OK";
}
