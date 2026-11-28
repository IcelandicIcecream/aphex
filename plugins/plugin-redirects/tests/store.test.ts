// The storage logic against an in-memory plugin store that behaves as the adapters
// do: scoped by organization, listed newest first, filtered by collection.
import { describe, expect, it } from 'vitest';
import type { PluginStorageRecord } from '@aphexcms/cms-core/server';
import { addRedirect } from '../src/lib/service';
import {
	findRedirect,
	listRedirects,
	moveAddresses,
	noteAddress,
	recordMove
} from '../src/lib/store';

function memoryStore() {
	const rows: PluginStorageRecord[] = [];
	let clock = 0;
	const store = {
		rows,
		async createPluginRecord(input: {
			organizationId: string;
			plugin: string;
			collection: string;
			data: Record<string, unknown>;
		}) {
			const row = {
				id: `id${rows.length + 1}`,
				...input,
				createdAt: new Date(1_700_000_000_000 + clock++)
			};
			rows.push(row);
			return row;
		},
		async getPluginRecord(organizationId: string, id: string) {
			return rows.find((row) => row.id === id && row.organizationId === organizationId) ?? null;
		},
		async listPluginRecords(o: {
			organizationId: string;
			plugin: string;
			collection?: string;
			limit?: number;
			offset?: number;
		}) {
			const found = rows
				.filter(
					(row) =>
						row.organizationId === o.organizationId &&
						row.plugin === o.plugin &&
						(!o.collection || row.collection === o.collection)
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const limit = o.limit ?? 50;
			const offset = o.offset ?? 0;
			return { items: found.slice(offset, offset + limit), total: found.length, limit, offset };
		},
		async updatePluginRecord(organizationId: string, id: string, data: Record<string, unknown>) {
			const row = rows.find((entry) => entry.id === id && entry.organizationId === organizationId);
			if (!row) return null;
			row.data = data;
			return row;
		},
		async deletePluginRecord(organizationId: string, id: string) {
			const at = rows.findIndex((row) => row.id === id && row.organizationId === organizationId);
			if (at === -1) return false;
			rows.splice(at, 1);
			return true;
		}
	};
	return store as typeof store & Parameters<typeof findRedirect>[0];
}

const ORG = 'org-a';
const pairs = async (db: ReturnType<typeof memoryStore>) =>
	(await listRedirects(db, ORG)).map((r) => `${r.from}${r.prefix ? '/*' : ''} → ${r.to}`).sort();

describe('redirects in plugin storage', () => {
	it('follows exact and prefix redirects, and counts the visit', async () => {
		const db = memoryStore();
		await recordMove(db, ORG, '/photo-credits', '/credits');
		await recordMove(db, ORG, '/blog', '/news', { prefix: true });
		expect(await findRedirect(db, ORG, '/photo-credits')).toBe('/credits');
		expect(await findRedirect(db, ORG, '/blog')).toBe('/news');
		expect(await findRedirect(db, ORG, '/blog/welcome')).toBe('/news/welcome');
		expect(await findRedirect(db, ORG, '/blogging')).toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 0));
		const hits = Object.fromEntries((await listRedirects(db, ORG)).map((r) => [r.from, r.hits]));
		expect(hits).toEqual({ '/photo-credits': 1, '/blog': 2 });
	});

	it('is one organization’s', async () => {
		const db = memoryStore();
		await recordMove(db, ORG, '/a', '/b');
		expect(await findRedirect(db, 'org-b', '/a')).toBeNull();
		expect(await listRedirects(db, 'org-b')).toEqual([]);
	});

	it('collapses chains and removes the loop a move back would make', async () => {
		const db = memoryStore();
		await recordMove(db, ORG, '/a', '/b');
		await recordMove(db, ORG, '/b', '/c');
		expect(await pairs(db)).toEqual(['/a → /c', '/b → /c']);
		await recordMove(db, ORG, '/c', '/a');
		expect(await pairs(db)).toEqual(['/b → /a', '/c → /a']);
	});

	it('moves a section there and back, keeping hand-made redirects pointing at it', async () => {
		const db = memoryStore();
		await recordMove(db, ORG, '/old-news', '/blog', { source: 'manual' });
		await recordMove(db, ORG, '/blog', '/news', { prefix: true });
		expect(await pairs(db)).toEqual(['/blog/* → /news', '/old-news → /news']);
		await recordMove(db, ORG, '/news', '/blog', { prefix: true });
		expect(await pairs(db)).toEqual(['/news/* → /blog', '/old-news → /blog']);
	});

	it('notes addresses, moves them with their section, and refuses redirects from a live one', async () => {
		const db = memoryStore();
		expect(await noteAddress(db, ORG, 'post-1', '/blog/welcome')).toBeNull();
		expect(await noteAddress(db, ORG, 'page-1', '/credits')).toBeNull();
		expect(await noteAddress(db, ORG, 'page-1', '/credits')).toBe('/credits');
		await moveAddresses(db, ORG, '/blog', '/news');
		expect(await noteAddress(db, ORG, 'post-1', '/news/welcome')).toBe('/news/welcome');

		const live = await addRedirect(db, ORG, '/credits', '/x');
		expect(live).toMatchObject({ ok: false, field: 'from' });
		const self = await addRedirect(db, ORG, '/x', '/x/');
		expect(self).toMatchObject({ ok: false, field: 'to' });
		const added = await addRedirect(db, ORG, 'https://old-cafe.com/about-us.html', '/credits');
		expect(added.ok).toBe(true);
		expect(await findRedirect(db, ORG, '/about-us.html', { count: false })).toBe('/credits');
	});

	it('sends a hand-made redirect to an old address straight on, and refuses a circle', async () => {
		const db = memoryStore();
		await recordMove(db, ORG, '/blog', '/news', { prefix: true });
		expect((await addRedirect(db, ORG, '/old-news', '/blog')).ok).toBe(true);
		expect(await pairs(db)).toEqual(['/blog/* → /news', '/old-news → /news']);
		await recordMove(db, ORG, '/p', '/q');
		expect(await addRedirect(db, ORG, '/q', '/p')).toMatchObject({ ok: false, field: 'to' });
	});
});
