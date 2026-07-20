import { and, eq, desc, count } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type {
	PluginStorageRecord,
	CreatePluginRecordInput,
	ListPluginRecordsOptions,
	Page
} from '@aphexcms/cms-core/server';
import type { cmsSchema } from './schema';
import type { PluginStorageRow } from './schema';

type DB = LibSQLDatabase<typeof cmsSchema>;
type Tables = typeof cmsSchema;

const toRecord = (r: PluginStorageRow): PluginStorageRecord => ({
	id: r.id,
	organizationId: r.organizationId,
	plugin: r.plugin,
	collection: r.collection,
	data: r.data,
	createdAt: r.createdAt
});

/**
 * Generic plugin storage on SQLite (libsql). Org isolation is WHERE-based (no RLS): every read
 * filters by organization_id and every write carries it. Runs on whichever `db` it holds — the
 * pooled db, or the transaction handle when the parent rebinds it inside `withTransaction`.
 */
export class SQLitePluginStorageAdapter {
	constructor(
		private db: DB,
		private tables: Tables
	) {}

	async createPluginRecord(input: CreatePluginRecordInput): Promise<PluginStorageRecord> {
		const [row] = await this.db
			.insert(this.tables.pluginStorage)
			.values({
				id: input.id,
				organizationId: input.organizationId,
				plugin: input.plugin,
				collection: input.collection,
				data: input.data
			})
			.returning();
		if (!row) throw new Error('createPluginRecord: insert returned no row');
		return toRecord(row);
	}

	async getPluginRecord(organizationId: string, id: string): Promise<PluginStorageRecord | null> {
		const [row] = await this.db
			.select()
			.from(this.tables.pluginStorage)
			.where(
				and(
					eq(this.tables.pluginStorage.id, id),
					eq(this.tables.pluginStorage.organizationId, organizationId)
				)
			)
			.limit(1);
		return row ? toRecord(row) : null;
	}

	async listPluginRecords(options: ListPluginRecordsOptions): Promise<Page<PluginStorageRecord>> {
		const { pluginStorage } = this.tables;
		const limit = options.limit ?? 50;
		const offset = options.offset ?? 0;
		const conds = [
			eq(pluginStorage.organizationId, options.organizationId),
			eq(pluginStorage.plugin, options.plugin)
		];
		if (options.collection) conds.push(eq(pluginStorage.collection, options.collection));
		const where = and(...conds);

		const rows = await this.db
			.select()
			.from(pluginStorage)
			.where(where)
			.orderBy(desc(pluginStorage.createdAt))
			.limit(limit)
			.offset(offset);
		const totals = await this.db.select({ value: count() }).from(pluginStorage).where(where);
		return { items: rows.map(toRecord), total: Number(totals[0]?.value ?? 0), limit, offset };
	}
}
