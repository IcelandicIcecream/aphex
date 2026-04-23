/**
 * API Key RBAC tests — hits a live dev server at localhost:5173.
 * Verifies capability scopes: read-only, write-only, read+write.
 *
 * Prereq: `pnpm dev` running on :5173, keys below provisioned for the org.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5173';

const KEYS = {
	read: 'JMRiWeAmoIcxzPqFvwtPFMrJdDiBMJgaTiZrdXCRJrgZenNvqgIVNGtsoNEvMVcy',
	readWrite: 'fNHmTOhLPtWMICTNEWQqZIVoGhBduebJDoYlkZjIjVbmxEOrTSgnQNnVwqyWrkSg',
	write: 'AgnIgMbTfPDYGgAYKWqoquOFNYBeITWqNDWGoImkPTCVlAqGvwEzOXtQezFtJTvA'
};

async function req(key: string, method: string, path: string, body?: unknown) {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: {
			'x-api-key': key,
			'content-type': 'application/json'
		},
		body: body ? JSON.stringify(body) : undefined
	});
	const text = await res.text();
	let json: any = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {}
	return { status: res.status, json, text };
}

function slugify() {
	return `apikey-test-${Math.random().toString(36).slice(2, 10)}`;
}

beforeAll(async () => {
	const res = await fetch(`${BASE}/api/documents?type=page&limit=1`, {
		headers: { 'x-api-key': KEYS.read }
	});
	if (res.status === 0 || res.status >= 500) {
		throw new Error(`Dev server not reachable at ${BASE}. Run \`pnpm dev\` first.`);
	}
});

describe('API Key — READ-only scope', () => {
	it('can list documents', async () => {
		const r = await req(KEYS.read, 'GET', '/api/documents?type=page&limit=5');
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
	});

	it('cannot create a document', async () => {
		const slug = slugify();
		const r = await req(KEYS.read, 'POST', '/api/documents', {
			type: 'page',
			draftData: { title: 'read-key create attempt', slug, published: false }
		});
		expect([401, 403]).toContain(r.status);
		expect(r.json?.success).not.toBe(true);
	});
});

// "Write" keys implicitly include read access — the CMS treats write as
// a superset of read rather than a disjoint scope. These tests document
// and enforce that semantic.
describe('API Key — WRITE scope (implies read)', () => {
	let createdId: string | null = null;

	it('can create a document', async () => {
		const slug = slugify();
		const r = await req(KEYS.write, 'POST', '/api/documents', {
			type: 'page',
			draftData: { title: 'write-key create', slug, published: false }
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		createdId = r.json?.data?.id ?? null;
		expect(createdId).toBeTruthy();
	});

	it('can read a document by id (write implies read)', async () => {
		if (!createdId) return;
		const r = await req(KEYS.write, 'GET', `/api/documents/${createdId}`);
		expect(r.status).toBe(200);
		expect(r.json?.data?.id).toBe(createdId);
	});

	it('can list documents (write implies read)', async () => {
		const r = await req(KEYS.write, 'GET', '/api/documents?type=page&limit=1');
		expect(r.status).toBe(200);
	});

	it('can delete a document it created (cleanup)', async () => {
		if (!createdId) return;
		const r = await req(KEYS.write, 'DELETE', `/api/documents/${createdId}`);
		expect([200, 204]).toContain(r.status);
	});
});

describe('API Key — READ+WRITE scope', () => {
	let createdId: string | null = null;

	it('can create a document', async () => {
		const slug = slugify();
		const r = await req(KEYS.readWrite, 'POST', '/api/documents', {
			type: 'page',
			draftData: { title: 'rw-key create', slug, published: false }
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		createdId = r.json?.data?.id ?? null;
	});

	it('can read the document it created', async () => {
		if (!createdId) return;
		const r = await req(KEYS.readWrite, 'GET', `/api/documents/${createdId}`);
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		expect(r.json?.data?.id).toBe(createdId);
	});

	it('can update the document', async () => {
		if (!createdId) return;
		const r = await req(KEYS.readWrite, 'PUT', `/api/documents/${createdId}`, {
			draftData: { title: 'rw-key updated', slug: slugify(), published: false }
		});
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
	});

	it('can delete the document (cleanup)', async () => {
		if (!createdId) return;
		const r = await req(KEYS.readWrite, 'DELETE', `/api/documents/${createdId}`);
		expect([200, 204]).toContain(r.status);
	});
});

describe('API Key — rejection without key', () => {
	it('returns 401 with no header', async () => {
		const r = await fetch(`${BASE}/api/documents?type=page`);
		expect(r.status).toBe(401);
	});

	it('returns 401 with invalid key', async () => {
		const r = await req('not-a-real-key', 'GET', '/api/documents?type=page');
		expect(r.status).toBe(401);
	});
});
