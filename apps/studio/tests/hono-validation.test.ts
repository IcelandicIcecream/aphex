import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createAphexApi } from '@aphexcms/cms-core/server/api/index';
import { listDocumentsQuery } from '@aphexcms/cms-core/api/schemas/documents';

/**
 * Phase 2 gate (running early in Phase 0): verifies `zValidator` parity
 * with the hand-rolled `safeParse` pattern used throughout
 * `cms-core/src/lib/routes/*.ts`. The wire format must not drift —
 * clients depend on `{ success: false, error, issues }` with status 400.
 */
describe('Hono zValidator — parity with hand-rolled safeParse', () => {
	it('coerces numeric query strings to numbers (page=2 → 2)', async () => {
		const app = createAphexApi();
		app.get('/list', zValidator('query', listDocumentsQuery), (c) => {
			const q = c.req.valid('query');
			return c.json({ page: q.page, pageSize: q.pageSize });
		});

		const res = await app.fetch(
			new Request('http://localhost/api/list?page=2&pageSize=5&type=post'),
			{ aphexCMS: null as any, auth: null }
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.page).toBe(2);
		expect(body.pageSize).toBe(5);
	});

	it('rejects bad query with 400 — same shape clients receive today', async () => {
		// Use a fresh app + matching shape: error envelope shape comes from
		// our own error hook, so verify with a custom hook that mirrors the
		// hand-rolled response in routes/documents.ts:22-30.
		const app = new Hono();
		const schema = z.object({
			page: z.coerce.number().int().min(1)
		});
		app.get(
			'/list',
			zValidator('query', schema, (result, c) => {
				if (!result.success) {
					return c.json(
						{
							success: false,
							error: 'Invalid query parameters',
							issues: result.error.issues
						},
						400
					);
				}
			}),
			(c) => c.json({ ok: true })
		);

		// page=foo is not coercible to a number ≥ 1
		const res = await app.fetch(new Request('http://localhost/list?page=foo'));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid query parameters');
		expect(Array.isArray(body.issues)).toBe(true);
		expect(body.issues.length).toBeGreaterThan(0);
	});

	it('rejects bad JSON body with 400 — matches POST envelope', async () => {
		const app = new Hono();
		const schema = z.object({
			type: z.string(),
			data: z.record(z.string(), z.unknown())
		});
		app.post(
			'/create',
			zValidator('json', schema, (result, c) => {
				if (!result.success) {
					return c.json(
						{
							success: false,
							error: 'Invalid request body',
							issues: result.error.issues
						},
						400
					);
				}
			}),
			(c) => c.json({ ok: true })
		);

		const res = await app.fetch(
			new Request('http://localhost/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: 'post' }) // missing `data`
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid request body');
		expect(body.issues.some((i: any) => i.path?.includes('data'))).toBe(true);
	});

	it('passes valid input through to the handler', async () => {
		const app = new Hono();
		const schema = z.object({ q: z.string().min(1) });
		app.get('/search', zValidator('query', schema), (c) => {
			const { q } = c.req.valid('query');
			return c.json({ q });
		});

		const res = await app.fetch(new Request('http://localhost/search?q=hello'));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ q: 'hello' });
	});
});
