/**
 * Генерирует TELEGRAM_BOT_INGEST_SECRET, кладёт в wrangler (helloword) и в корневой .env
 * (без печати секрета в stdout). Нужен CLOUDFLARE_API_TOKEN в .env / .env.local.
 *
 * Флаги:
 *   --env-only  — только обновить корневой .env (wrangler не вызывать).
 */

import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const envOnly = process.argv.includes("--env-only");

function writeEnvSecret(secret) {
  const envPath = path.join(root, ".env");
  let body = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  body = body.replace(/\r?\n?^TELEGRAM_BOT_INGEST_SECRET=.*$/gm, "").replace(/\s+$/, "");
  const line = `TELEGRAM_BOT_INGEST_SECRET=${secret}`;
  body = `${body}${body.endsWith("\n") || body.length === 0 ? "" : "\n"}\n${line}\n`;
  writeFileSync(envPath, body, "utf8");
}

function parseDotEnv(filepath) {
  if (!existsSync(filepath)) return {};
  let text = readFileSync(filepath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
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

const merged = {
  ...parseDotEnv(path.join(root, ".env")),
  ...parseDotEnv(path.join(root, ".env.local")),
};

const cf = merged.CLOUDFLARE_API_TOKEN?.trim();

const secret = randomBytes(32).toString("hex");

if (envOnly) {
  writeEnvSecret(secret);
  console.log("TELEGRAM_BOT_INGEST_SECRET добавлен в .env (--env-only, wrangler не вызывался).");
  process.exit(0);
}

if (!cf) {
  console.error(
    "Нет CLOUDFLARE_API_TOKEN в .env или .env.local — wrangler не сможет записать секрет. Локально можно: node scripts/set-telegram-ingest-secret.mjs --env-only, затем вручную тот же секрет в Workers.",
  );
  process.exit(1);
}

const wr = spawnSync(
  "npx",
  ["wrangler", "secret", "put", "TELEGRAM_BOT_INGEST_SECRET"],
  {
    cwd: path.join(root, "aibddck", "helloword"),
    input: `${secret}\n`,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, CLOUDFLARE_API_TOKEN: cf },
    stdio: ["pipe", "inherit", "inherit"],
  },
);

if (wr.status !== 0) {
  writeEnvSecret(secret);
  console.error(
    "\nНе удалось записать секрет в Cloudflare Workers (helloword). В корневой .env всё же записан новый TELEGRAM_BOT_INGEST_SECRET для бота.\n" +
      "Синхронизируйте воркер: после исправления токена с правами Workers или через Dashboard задайте тот же ключ, что в .env,\n" +
      "или из каталога aibddck/helloword: npx wrangler secret put TELEGRAM_BOT_INGEST_SECRET\n",
  );
  process.exit(wr.status === null ? 1 : wr.status);
}

writeEnvSecret(secret);

console.log("TELEGRAM_BOT_INGEST_SECRET записан в wrangler helloword и добавлен в .env");
