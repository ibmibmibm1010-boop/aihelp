import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: path.resolve(__dirname),
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
      "@app": path.resolve(__dirname, "src/app"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@widgets": path.resolve(__dirname, "src/widgets"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["**/node_modules/**", "**/aibddck/**", "**/e2e/**"],
  },
});
