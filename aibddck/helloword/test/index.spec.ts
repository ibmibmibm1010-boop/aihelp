import { describe, it, expect } from 'vitest';
import worker from '../src';

function createTestCtx(): ExecutionContext {
	const waitUntil = (p: Promise<unknown>) => {
		void p;
	};
	return { waitUntil, passThroughOnException: () => {} } as ExecutionContext;
}

async function waitOnExecutionContext(ctx: ExecutionContext): Promise<void> {
	void ctx;
}

const testEnv: Env = {
	// /message, /random не трогают секрет; пустая строка для типов
	VENICE_API_KEY: '',
};

describe('Hello World user worker', () => {
	describe('request for /message', () => {
		it('/ responds with "Hello, World!" (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>(
				'http://example.com/message',
			);
			const ctx = createTestCtx();
			const response = await worker.fetch(request, testEnv, ctx);
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatchInlineSnapshot(`"Hello, World!"`);
		});

		it('responds with "Hello, World!" (integration style)', async () => {
			const request = new Request('http://example.com/message');
			const response = await worker.fetch(request, testEnv, createTestCtx());
			expect(await response.text()).toMatchInlineSnapshot(`"Hello, World!"`);
		});
	});

	describe('request for /random', () => {
		it('/ responds with a random UUID (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>(
				'http://example.com/random',
			);
			const ctx = createTestCtx();
			const response = await worker.fetch(request, testEnv, ctx);
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatch(
				/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
			);
		});

		it('responds with a random UUID (integration style)', async () => {
			const request = new Request('http://example.com/random');
			const response = await worker.fetch(request, testEnv, createTestCtx());
			expect(await response.text()).toMatch(
				/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
			);
		});
	});
});
