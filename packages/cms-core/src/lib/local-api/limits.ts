// local-api/limits.ts
//
// `config.documentLimits`, enforced. Every create goes through `CollectionAPI.create`
// (the studio, REST, GraphQL and MCP are all wrappers around it), so checking here
// means a plan's limit holds however a document is made.

import type { DatabaseAdapter } from '../db/index';
import type { DocumentLimitResolver } from '../types/config';
import type { LocalAPIContext } from './types';

/** An organization has created as many documents of a type as its limit allows. */
export class DocumentLimitError extends Error {
	constructor(
		message: string,
		readonly type: string,
		readonly max: number
	) {
		super(message);
		this.name = 'DocumentLimitError';
	}
}

/** Runs before a create. Throws `DocumentLimitError` at the limit. Needs only a document count. */
export type DocumentLimitGuard = (
	context: LocalAPIContext,
	type: string,
	adapter: Pick<DatabaseAdapter, 'countDocuments'>
) => Promise<void>;

export function createDocumentLimitGuard(resolve: DocumentLimitResolver): DocumentLimitGuard {
	return async (context, type, adapter) => {
		// System writes act for the instance, not on a plan.
		if (context.overrideAccess) return;
		const limit = await resolve({ organizationId: context.organizationId, type });
		if (!limit) return;

		const used = await adapter.countDocuments(
			context.organizationId,
			type,
			limit.since ? { createdAt: { greater_than_equal: limit.since } } : undefined
		);
		if (used >= limit.max) {
			throw new DocumentLimitError(
				limit.message ??
					`This organization has reached its limit of ${limit.max} ${type} documents${limit.since ? ' for this period' : ''}.`,
				type,
				limit.max
			);
		}
	};
}
