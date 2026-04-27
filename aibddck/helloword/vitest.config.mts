import { defineConfig } from 'vitest/config';

/**
 * Cloudflare `vitest-pool-workers` + Miniflare на Windows с путями, содержащими
 * не-ASCII, часто падает с `No such module "cloudflare:test-internal"`.
 * Здесь тестируем `fetch` воркера в Node с моком `env` / `ExecutionContext` —
 * тот же код обработчика, без рантайма workerd.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.spec.ts'],
	},
});
