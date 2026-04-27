/**
 * Применяет supabase/add_board_members.sql через Management API.
 * Нужен SUPABASE_ACCESS_TOKEN (как у db:apply-boards).
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
  console.error("Нужен SUPABASE_ACCESS_TOKEN в .env.local (сохраните файл) или в окружении.");
  process.exit(1);
}

if (!projectRef) {
  console.error("Не найден проект (VITE_SUPABASE_URL).");
  process.exit(1);
}

const sqlPath = path.join(root, "supabase", "add_board_members.sql");
if (!existsSync(sqlPath)) {
  console.error("Не найден:", sqlPath);
  process.exit(1);
}

const query = stripSqlComments(readFileSync(sqlPath, "utf8"));
if (!query) {
  console.error("Пустой SQL.");
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
  console.error(`Ошибка ${res.status}:`, text);
  process.exit(1);
}

console.log(`Миграция участников применена к проекту ${projectRef}.`);
if (text && text !== "{}") {
  console.log(text.length > 800 ? `${text.slice(0, 800)}…` : text);
}
