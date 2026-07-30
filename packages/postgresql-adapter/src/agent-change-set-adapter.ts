import { and, eq, desc, count, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
	AgentChangeSet,
	AgentOperation,
	AgentChangeSetWithOperations,
	CreateAgentChangeSetInput,
	RecordAgentOperationInput,
	CompleteAgentChangeSetInput,
	ListAgentChangeSetsOptions,
	Page
} from '@aphexcms/cms-core/server';
import type { cmsSchema } from './schema';
import type { AgentChangeSetRow, AgentOperationRow } from './schema';

type DB = NodePgDatabase<typeof cmsSchema>;
type Tables = typeof cmsSchema;

const toChangeSet = (r: AgentChangeSetRow): AgentChangeSet => ({
	id: r.id,
	organizationId: r.organizationId,
	createdBy: r.createdBy,
	status: r.status,
	summary: r.summary,
	provider: r.provider,
	model: r.model,
	promptTokens: r.promptTokens,
	completionTokens: r.completionTokens,
	createdAt: r.createdAt,
	completedAt: r.completedAt
});

const toOperation = (r: AgentOperationRow): AgentOperation => ({
	id: r.id,
	changeSetId: r.changeSetId,
	organizationId: r.organizationId,
	collection: r.collection,
	documentId: r.documentId,
	toolName: r.toolName,
	arguments: r.arguments,
	success: r.success,
	error: r.error,
	versionBefore: r.versionBefore,
	versionAfter: r.versionAfter,
	createdAt: r.createdAt
});

/**
 * The agent audit/undo trail on PostgreSQL. Unlike `PostgreSQLEventJobAdapter`, recording
 * here is a best-effort side observation (see the route handler that calls this), not
 * atomic with the document write's own transaction — so this class is never rebound onto a
 * `withTransaction` handle the way the event/job adapter is.
 */
export class PostgreSQLAgentChangeSetAdapter {
	constructor(
		private db: DB,
		private tables: Tables
	) {}

	async createChangeSet(input: CreateAgentChangeSetInput): Promise<AgentChangeSet> {
		const [row] = await this.db
			.insert(this.tables.agentChangeSets)
			.values({
				organizationId: input.organizationId,
				createdBy: input.createdBy ?? null,
				summary: input.summary ?? null,
				provider: input.provider,
				model: input.model
			})
			.returning();
		if (!row) throw new Error('createChangeSet: insert returned no row');
		return toChangeSet(row);
	}

	async recordOperation(input: RecordAgentOperationInput): Promise<AgentOperation> {
		const [row] = await this.db
			.insert(this.tables.agentOperations)
			.values({
				changeSetId: input.changeSetId,
				organizationId: input.organizationId,
				collection: input.collection,
				documentId: input.documentId,
				toolName: input.toolName,
				arguments: input.arguments,
				success: input.success,
				error: input.error ?? null,
				versionBefore: input.versionBefore ?? null,
				versionAfter: input.versionAfter ?? null
			})
			.returning();
		if (!row) throw new Error('recordOperation: insert returned no row');
		return toOperation(row);
	}

	async completeChangeSet(
		organizationId: string,
		id: string,
		input: CompleteAgentChangeSetInput
	): Promise<void> {
		await this.db
			.update(this.tables.agentChangeSets)
			.set({
				status: input.status,
				promptTokens: input.promptTokens,
				completionTokens: input.completionTokens,
				completedAt: new Date()
			})
			.where(
				and(
					eq(this.tables.agentChangeSets.id, id),
					eq(this.tables.agentChangeSets.organizationId, organizationId)
				)
			);
	}

	async getChangeSet(
		organizationId: string,
		id: string
	): Promise<AgentChangeSetWithOperations | null> {
		const [row] = await this.db
			.select()
			.from(this.tables.agentChangeSets)
			.where(
				and(
					eq(this.tables.agentChangeSets.id, id),
					eq(this.tables.agentChangeSets.organizationId, organizationId)
				)
			)
			.limit(1);
		if (!row) return null;

		const operations = await this.db
			.select()
			.from(this.tables.agentOperations)
			.where(eq(this.tables.agentOperations.changeSetId, id))
			.orderBy(this.tables.agentOperations.createdAt);

		return { ...toChangeSet(row), operations: operations.map(toOperation) };
	}

	async listChangeSets(
		options: ListAgentChangeSetsOptions
	): Promise<Page<AgentChangeSetWithOperations>> {
		const { agentChangeSets, agentOperations } = this.tables;
		const limit = options.limit ?? 50;
		const offset = options.offset ?? 0;
		const where = eq(agentChangeSets.organizationId, options.organizationId);

		const rows = await this.db
			.select()
			.from(agentChangeSets)
			.where(where)
			.orderBy(desc(agentChangeSets.createdAt))
			.limit(limit)
			.offset(offset);
		const totals = await this.db.select({ value: count() }).from(agentChangeSets).where(where);

		// One extra query for every operation belonging to this page's change-sets, grouped in
		// JS — avoids an N+1 fetch per row just so the list can show *what* each turn did (e.g.
		// "create_document"), not just who ran it.
		const ids = rows.map((r) => r.id);
		const opsByChangeSet = new Map<string, AgentOperation[]>();
		if (ids.length > 0) {
			const opRows = await this.db
				.select()
				.from(agentOperations)
				.where(inArray(agentOperations.changeSetId, ids))
				.orderBy(agentOperations.createdAt);
			for (const opRow of opRows) {
				const op = toOperation(opRow);
				const list = opsByChangeSet.get(op.changeSetId);
				if (list) list.push(op);
				else opsByChangeSet.set(op.changeSetId, [op]);
			}
		}

		return {
			items: rows.map((r) => ({ ...toChangeSet(r), operations: opsByChangeSet.get(r.id) ?? [] })),
			total: Number(totals[0]?.value ?? 0),
			limit,
			offset
		};
	}
}
