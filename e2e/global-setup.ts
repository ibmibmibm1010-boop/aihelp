import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { chromium, type FullConfig } from "@playwright/test";

const configDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(configDir, ".env") });
loadEnv({ path: path.join(configDir, "aibddck", ".env") });

const authFile = path.join(configDir, "e2e", ".auth", "user.json");

/**
 * Сохраняет `e2e/.auth/user.json` для сценариев с сессией.
 * Когда E2E_USER_* заданы — один раз логин вместо отдельного project `setup` (и одно дерево тестов в UI).
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || password == null || String(password) === "") {
    // eslint-disable-next-line no-console
    console.log(
      "E2E: E2E_USER_EMAIL / E2E_USER_PASSWORD не заданы — storage для «authed» не создаётся (см. .env.example).",
    );
    return;
  }

  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:5173";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${baseURL}/sign-in`, { waitUntil: "domcontentloaded" });
    await page.locator("#signin-email").fill(email);
    await page.locator("#signin-password").fill(String(password));
    await page
      .locator("form")
      .filter({ has: page.locator("#signin-email") })
      .locator('button[type="submit"]')
      .click();
    await page.waitForURL(/\/boards\/?$/, { timeout: 30_000 });
    mkdirSync(path.dirname(authFile), { recursive: true });
    await page.context().storageState({ path: authFile });
  } finally {
    await browser.close();
  }
}
