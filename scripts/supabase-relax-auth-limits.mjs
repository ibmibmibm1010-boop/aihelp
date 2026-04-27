/**
 * Ослабляет лимиты Auth через Supabase Management API.
 *
 * 1) Создайте токен: https://supabase.com/dashboard/account/tokens
 * 2) В PowerShell из корня проекта:
 *    $env:SUPABASE_ACCESS_TOKEN="ваш_токен"
 *    npm run supabase:relax-auth-limits
 *
 * PROJECT_REF берётся из VITE_SUPABASE_URL в .env или задайте SUPABASE_PROJECT_REF.
 *
 * Дополнительно вручную: Dashboard → Authentication → Rate Limits
 * https://supabase.com/dashboard/project/_/auth/rate-limits
 *
 * Примечание: у встроенного SMTP есть платформенный потолок писем/час;
 * для продакшена обычно подключают Custom SMTP (Authentication → SMTP).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseDotEnv(filepath) {
  if (!existsSync(filepath)) {
    return {};
  }
  const text = readFileSync(filepath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    const i = t.indexOf("=");
    if (i === -1) {
      continue;
    }
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function refFromSupabaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    const [sub] = host.split(".");
    return sub || null;
  } catch {
    return null;
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const envFile = parseDotEnv(path.join(root, ".env"));
const url = process.env.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL;
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || refFromSupabaseUrl(url);

if (!token) {
  console.error(
    "Укажите переменную окружения SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).",
  );
  process.exit(1);
}

if (!projectRef) {
  console.error(
    "Не найден проект: задайте VITE_SUPABASE_URL в .env или SUPABASE_PROJECT_REF.",
  );
  process.exit(1);
}

/** Большие значения для разработки; платформа может ограничивать отдельные квоты. */
const body = {
  rate_limit_anonymous_users: 100_000,
  rate_limit_email_sent: 100_000,
  rate_limit_sms_sent: 100_000,
  rate_limit_verify: 100_000,
  rate_limit_token_refresh: 100_000,
  rate_limit_otp: 100_000,
  rate_limit_web3: 100_000,
};

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const res = await fetch(endpoint, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Ошибка ${res.status} при PATCH ${endpoint}`);
  console.error(text);
  process.exit(1);
}

console.log("Лимиты Auth обновлены через Management API.");
console.log(text.length > 500 ? `${text.slice(0, 500)}…` : text);
console.log(
  "\nЕсли письма всё ещё режутся: Authentication → SMTP (свой провайдер) и проверьте Rate Limits в Dashboard.",
);
