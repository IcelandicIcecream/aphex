// Redirects in plugin storage (`cms_plugin_storage`): no tables of their own, and
// every row scoped to its organization like the rest of that table.
//
// The collection a record sits under is its lookup key, since the storage's index
// is (organization, plugin, collection), so following a redirect is a few index
// reads however many rows there are, on this site or any other:
//
// - `r:<path>`  a redirect from exactly that path
// - `p:<path>`  a redirect from that path and everything under it
// - `a:<id>`    where a published document lives now (to see it move)
// - `s:<name>`  where a section lives now (a blog whose address is a setting)
// - `l:<path>`  something is live at that path (so nobody redirects away from it)
//
// Only changes scan the whole list (a move collapsing chains, the Redirects screen),
// and those are rare.
import type { DatabaseAdapter, PluginStorageRecord } from '@aphexcms/cms-core/server';
import { ancestors, MAX_PATH_LENGTH } from './paths';

export const PLUGIN_ID = '@aphexcms/plugin-redirects';

type Storage = Pick<
	DatabaseAdapter,
	| 'createPluginRecord'
	| 'getPluginRecord'
	| 'listPluginRecords'
	| 'updatePluginRecord'
	| 'deletePluginRecord'
> &
	Partial<Pick<DatabaseAdapter, 'withTransaction'>>;

export interface Redirect {
	id: string;
	from: string;
	to: string;
	/** Everything under `from` too, kept under `to`. */
	prefix: boolean;
	/** `auto`: an address changed on publish. `manual`: added by someone. */
	source: 'auto' | 'manual';
	hits: number;
	lastHitAt: string | null;
	createdAt: string;
}

interface RuleData {
	from: string;
	to: string;
	prefix: boolean;
	source: 'auto' | 'manual';
	hits?: number;
	lastHitAt?: string | null;
}

const keyable = (path: string) => path.length <= MAX_PATH_LENGTH;
const ruleKey = (from: string, prefix: boolean) => `${prefix ? 'p' : 'r'}:${from}`;

async function one(db: Storage, organizationId: string, collection: string) {
	const page = await db.listPluginRecords({
		organizationId,
		plugin: PLUGIN_ID,
		collection,
		limit: 1
	});
	return page.items[0] ?? null;
}

/** Every record of this plugin on the site whose collection starts with one of `kinds`. */
async function all(
	db: Storage,
	organizationId: string,
	kinds: string[]
): Promise<PluginStorageRecord[]> {
	const out: PluginStorageRecord[] = [];
	const limit = 1000;
	for (let offset = 0; ; offset += limit) {
		const page = await db.listPluginRecords({ organizationId, plugin: PLUGIN_ID, limit, offset });
		out.push(
			...page.items.filter((item) => kinds.some((kind) => item.collection.startsWith(kind)))
		);
		if (page.items.length < limit) return out;
	}
}

function toRedirect(record: PluginStorageRecord): Redirect {
	const data = record.data as unknown as RuleData;
	return {
		id: record.id,
		from: data.from,
		to: data.to,
		prefix: data.prefix === true,
		source: data.source === 'auto' ? 'auto' : 'manual',
		hits: typeof data.hits === 'number' ? data.hits : 0,
		lastHitAt: typeof data.lastHitAt === 'string' ? data.lastHitAt : null,
		createdAt: new Date(record.createdAt).toISOString()
	};
}

// ---------- following them ----------

/**
 * Where `path` goes on this site, or null: the redirect for exactly it, else the
 * nearest one covering it (`/blog` → `/news` takes `/blog/x` to `/news/x`). Counts
 * the visit unless `count` is false. `path` is normalized (`normalizePath`).
 */
export async function findRedirect(
	db: Storage,
	organizationId: string,
	path: string,
	{ count = true }: { count?: boolean } = {}
): Promise<string | null> {
	if (!keyable(path)) return null;
	const prefixes = ancestors(path);
	const [exact, ...covering] = await Promise.all([
		one(db, organizationId, `r:${path}`),
		...prefixes.map((at) => one(db, organizationId, `p:${at}`))
	]);
	let record: PluginStorageRecord | null = exact;
	let target: string | null = exact ? (exact.data as unknown as RuleData).to : null;
	if (!record) {
		const at = covering.findIndex(Boolean);
		if (at === -1) return null;
		record = covering[at]!;
		const from = prefixes[at] ?? path;
		const rest = from === '/' ? path : path.slice(from.length);
		target = `${(record.data as unknown as RuleData).to.replace(/\/$/, '')}${rest}` || '/';
	}
	if (count) {
		const data = record.data as unknown as RuleData;
		void db
			.updatePluginRecord(organizationId, record.id, {
				...data,
				hits: (data.hits ?? 0) + 1,
				lastHitAt: new Date().toISOString()
			})
			.catch(() => {});
	}
	return target === path ? null : target;
}

/** Whether something is published at `path` now, as far as this plugin has seen. */
export async function isLive(db: Storage, organizationId: string, path: string): Promise<boolean> {
	return keyable(path) && (await one(db, organizationId, `l:${path}`)) !== null;
}

// ---------- the list ----------

export async function listRedirects(db: Storage, organizationId: string): Promise<Redirect[]> {
	const records = await all(db, organizationId, ['r:', 'p:']);
	return records.map(toRedirect).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRedirect(db: Storage, organizationId: string, id: string) {
	const record = await db.getPluginRecord(organizationId, id);
	if (!record || record.plugin !== PLUGIN_ID || !/^[rp]:/.test(record.collection)) return false;
	return db.deletePluginRecord(organizationId, id);
}

/** Runs `work` in one transaction where the adapter offers one. */
async function atomically(db: Storage, work: (db: Storage) => Promise<void>) {
	if (db.withTransaction) await db.withTransaction((tx) => work(tx as unknown as Storage));
	else await work(db);
}

/**
 * `from` now leads to `to`. Whatever led to `from` leads to `to` (a prefix move
 * carries the paths under it), so chains never grow. After a move (`auto`), a
 * redirect from `to` goes: something lives there again, and it would only send
 * people away. One left pointing at itself goes too.
 */
export async function recordMove(
	db: Storage,
	organizationId: string,
	from: string,
	to: string,
	{ prefix = false, source = 'auto' }: { prefix?: boolean; source?: 'auto' | 'manual' } = {}
) {
	if (from === to || !keyable(from)) return;
	await atomically(db, async (db) => {
		const rules = await all(db, organizationId, ['r:', 'p:']);
		for (const record of rules) {
			const data = record.data as unknown as RuleData;
			let next: string | null = null;
			if (data.to === from) next = to;
			else if (prefix && data.to.startsWith(`${from}/`))
				next = `${to}${data.to.slice(from.length)}`;
			const sameFrom = data.from === from;
			const backHere = source === 'auto' && data.from === to;
			if (sameFrom || backHere || (next !== null && next === data.from)) {
				await db.deletePluginRecord(organizationId, record.id);
			} else if (next !== null) {
				await db.updatePluginRecord(organizationId, record.id, { ...data, to: next });
			}
		}
		const data: RuleData = { from, to, prefix, source, hits: 0, lastHitAt: null };
		await db.createPluginRecord({
			organizationId,
			plugin: PLUGIN_ID,
			collection: ruleKey(from, prefix),
			data: data as unknown as Record<string, unknown>
		});
	});
}

// ---------- where things live ----------

async function setLive(
	db: Storage,
	organizationId: string,
	owner: string,
	from: string | null,
	to: string
) {
	if (from && keyable(from)) {
		const old = await one(db, organizationId, `l:${from}`);
		if (old && old.data.owner === owner) await db.deletePluginRecord(organizationId, old.id);
	}
	if (keyable(to) && !(await one(db, organizationId, `l:${to}`))) {
		await db.createPluginRecord({
			organizationId,
			plugin: PLUGIN_ID,
			collection: `l:${to}`,
			data: { owner }
		});
	}
}

/**
 * Notes where `key` (a document id, or `s:<section>`) lives now. Returns where it
 * lived before, or null the first time it's seen.
 */
export async function noteAddress(
	db: Storage,
	organizationId: string,
	key: string,
	path: string
): Promise<string | null> {
	const collection = key.startsWith('s:') ? key : `a:${key}`;
	const record = await one(db, organizationId, collection);
	const before = typeof record?.data.path === 'string' ? record.data.path : null;
	if (before === path) return before;
	if (record) await db.updatePluginRecord(organizationId, record.id, { path });
	else
		await db.createPluginRecord({ organizationId, plugin: PLUGIN_ID, collection, data: { path } });
	await setLive(db, organizationId, key, before, path);
	return before;
}

/** Where a section lives now, or `fallback` before it's been seen. */
export async function sectionPath(
	db: Storage,
	organizationId: string,
	name: string,
	fallback: string
) {
	const record = await one(db, organizationId, `s:${name}`);
	return typeof record?.data.path === 'string' ? record.data.path : fallback;
}

/** A section moved: the documents noted under it move with it. */
export async function moveAddresses(db: Storage, organizationId: string, from: string, to: string) {
	const addresses = await all(db, organizationId, ['a:']);
	for (const record of addresses) {
		const path = record.data.path;
		if (typeof path !== 'string' || !path.startsWith(`${from}/`)) continue;
		const next = `${to}${path.slice(from.length)}`;
		await db.updatePluginRecord(organizationId, record.id, { path: next });
		await setLive(db, organizationId, record.collection.slice(2), path, next);
	}
}
