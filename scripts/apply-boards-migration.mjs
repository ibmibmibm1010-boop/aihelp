/**
 * Создаёт таблицу public.boards и политики RLS через Supabase Management API.
 * (MCP SQL у проекта в read-only; anon-ключ DDL выполнить не может.)
 *
 * 1) Токен: https://supabase.com/dashboard/account/tokens
 * 2) Токен можно задать в .env.local (файл в .gitignore):
 *      SUPABASE_ACCESS_TOKEN=sbp_...
 *    или в PowerShell: $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *    затем: npm run db:apply-boards
 *
 * PROJECT_REF берётся из VITE_SUPABASE_URL в .env / .env.development / .env.local
 * или задайте SUPABASE_PROJECT_REF.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseDotEnv(filepath) {
  if (!existsSync(filepath)) {
    return {};
  }
  let text = readFileSync(filepath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
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

function stripSqlComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith("--");
    })
    .join("\n")
    .trim();
}

const envMerged = {
  ...parseDotEnv(path.join(root, ".env")),
  ...parseDotEnv(path.join(root, ".env.development")),
  ...parseDotEnv(path.join(root, ".env.local")),
  ...parseDotEnv(path.join(process.cwd(), ".env.local")),
};
const token =
  process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
  envMerged.SUPABASE_ACCESS_TOKEN?.trim();
const url = process.env.VITE_SUPABASE_URL?.trim() || envMerged.VITE_SUPABASE_URL;
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || refFromSupabaseUrl(url);

if (!token) {
  const hints = [
    "Нужен SUPABASE_ACCESS_TOKEN (личный токен, не anon key):",
    "  https://supabase.com/dashboard/account/tokens",
    "Добавьте в корень проекта файл .env.local строку: SUPABASE_ACCESS_TOKEN=sbp_...",
    "Сохраните файл на диск (Ctrl+S) — иначе Node не увидит переменную.",
    "Либо в PowerShell: $env:SUPABASE_ACCESS_TOKEN=\"sbp_...\"; npm run db:apply-boards",
  ];
  const localPaths = new Set([
    path.join(root, ".env.local"),
    path.join(process.cwd(), ".env.local"),
  ]);
  for (const p of localPaths) {
    if (!existsSync(p)) {
      continue;
    }
    let raw = readFileSync(p, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    if (!/^\s*SUPABASE_ACCESS_TOKEN\s*=/m.test(raw)) {
      hints.push(`Проверьте ${p}: на диске нет строки SUPABASE_ACCESS_TOKEN= (сохраните редактор).`);
    }
  }
  console.error(hints.join("\n"));
  process.exit(1);
}

if (!projectRef) {
  console.error(
    "Не найден проект: задайте VITE_SUPABASE_URL в .env / .env.development или SUPABASE_PROJECT_REF.",
  );
  process.exit(1);
}

const sqlPath = path.join(root, "supabase", "create_boards.sql");
if (!existsSync(sqlPath)) {
  console.error("Не найден файл:", sqlPath);
  process.exit(1);
}

const query = stripSqlComments(readFileSync(sqlPath, "utf8"));
if (!query) {
  console.error("Пустой SQL после удаления комментариев.");
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Ошибка ${res.status} при POST ${endpoint}`);
  console.error(text);
  process.exit(1);
}

console.log(`Таблица boards применена к проекту ${projectRef}.`);
if (text && text !== "{}") {
  console.log(text.length > 800 ? `${text.slice(0, 800)}…` : text);
}
