import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test as base } from "@playwright/test";

const authFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
  "user.json",
);

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

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
