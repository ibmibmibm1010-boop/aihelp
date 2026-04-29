import fs from "node:fs";

import path from "path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  let raw = fs.readFileSync(filePath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.length || t.startsWith("#")) {
      continue;
    }
    const eq = t.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
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

function mergedViteStripePaymentLink(mode: string): string {
  const names = [
    ".env",
    ".env.local",
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];
  let merged: Record<string, string> = {};
  for (const name of names) {
    merged = { ...merged, ...parseEnvFile(path.join(rootDir, name)) };
  }
  return (merged.VITE_STRIPE_PAYMENT_LINK ?? "").trim();
}

export default defineConfig(({ mode }) => {
  /** Явное чтение .env-слоёв: на Windows иногда переменная не попадала в import.meta.env. */
  const stripePaymentLink = mergedViteStripePaymentLink(mode);

  return {
    envDir: rootDir,
    ...(stripePaymentLink.length > 0
      ? {
          define: {
            "import.meta.env.VITE_STRIPE_PAYMENT_LINK": JSON.stringify(stripePaymentLink),
          },
        }
      : {}),
    plugins: [react()],
    server: {
      port: 5173,
      // If 5173 is taken (e.g. another `vite`), use the next free port instead of exiting.
      strictPort: false,
      proxy: {
        "/api/helloword": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/helloword/, "") || "/",
          configure(proxy) {
            proxy.on("error", (err) => {
              console.error("[vite proxy /api/helloword]", err.message);
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        "@app": path.resolve(rootDir, "src/app"),
        "@pages": path.resolve(rootDir, "src/pages"),
        "@shared": path.resolve(rootDir, "src/shared"),
        "@entities": path.resolve(rootDir, "src/entities"),
        "@widgets": path.resolve(rootDir, "src/widgets"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      exclude: ["**/node_modules/**", "**/aibddck/**", "**/e2e/**"],
    },
  };
});
