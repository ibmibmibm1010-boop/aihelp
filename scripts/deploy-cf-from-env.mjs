/**
 * Деплой Cloudflare (SPA + helloword) с подхватом CLOUDFLARE_* из корневого .env / .env.local.
 * Запуск из корня: npm run deploy:cf:from-env
 */

import { spawnSync } from "node:child_process";
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

const baseEnv = parseDotEnv(path.join(root, ".env"));
const localEnv = parseDotEnv(path.join(root, ".env.local"));

if (
  baseEnv.CLOUDFLARE_API_TOKEN?.trim()?.length &&
  localEnv.CLOUDFLARE_API_TOKEN?.trim()?.length &&
  baseEnv.CLOUDFLARE_API_TOKEN.trim() !== localEnv.CLOUDFLARE_API_TOKEN.trim()
) {
  console.warn(
    "[deploy-cf-from-env] В .env и .env.local разные CLOUDFLARE_API_TOKEN — wrangler получит значение из .env.local (он перекрывает .env).",
  );
}

const merged = {
  ...baseEnv,
  ...localEnv,
};

const token = (merged.CLOUDFLARE_API_TOKEN ?? "").replace(/\r?\n/g, "").trim();
const accountId = (merged.CLOUDFLARE_ACCOUNT_ID ?? "").replace(/\r?\n/g, "").trim();

if (!token) {
  console.error(
    "В .env или .env.local нет CLOUDFLARE_API_TOKEN (или значение пустое). См. .env.example.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: token,
  ...(accountId ? { CLOUDFLARE_ACCOUNT_ID: accountId } : {}),
};

if (!accountId) {
  console.warn(
    "CLOUDFLARE_ACCOUNT_ID не задан в .env — wrangler возьмёт из wrangler.toml / кэша, если есть.",
  );
}

const r = spawnSync("npm", ["run", "deploy:cf:all"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});

process.exit(r.status === null ? 1 : r.status);
