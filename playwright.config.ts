import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(configDir, ".env") });
config({ path: path.join(configDir, "aibddck", ".env") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  /* Если 5173 свободен — поднимает Vite. Если `npm run dev` уже на 5173, переиспользуется. */
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  /* Один project — в Playwright UI видно единое дерево всех .spec, без путаницы с «какой project выбран». */
  globalSetup: path.join(configDir, "e2e", "global-setup.ts"),
  projects: [
    {
      name: "e2e",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
