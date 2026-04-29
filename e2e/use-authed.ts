import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test as base } from "@playwright/test";

const authFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
  "user.json",
);

/** Как в global-setup: без этого сессию в `e2e/.auth` не создать. */
export function e2eAuthEnvConfigured(): boolean {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;
  return Boolean(email && password != null && String(password) !== "");
}

/**
 * Важно: не вызывать `test.use({ storageState })` на `base` из `@playwright/test` — это
 * мутирует синглтон `test` и вешает сессию на **все** тесты в воркере, включая гостей.
 * Расширяем `base` в отдельный тип; импортируют `test` / `expect` по-прежнему только
 * spec-и с `use-authed`, остальные — из `@playwright/test`.
 */
export const test = existsSync(authFile)
  ? base.extend({
      use: {
        storageState: authFile,
      },
    })
  : base;

/** Сценарии с `storageState`; без секретов — skipped (fork/CI без пользователя не красный). */
export function describeAuthSuite(title: string, fn: () => void): void {
  if (!e2eAuthEnvConfigured()) {
    test.describe.skip(
      `${title} — задайте E2E_USER_EMAIL и E2E_USER_PASSWORD в GitHub Actions Secrets`,
      fn,
    );
    return;
  }
  test.describe(title, fn);
}

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
