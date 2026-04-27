import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test as base } from "@playwright/test";

const authFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
  "user.json",
);

export const test = base;

if (existsSync(authFile)) {
  test.use({ storageState: authFile });
}

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
