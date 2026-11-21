// local-api/limits.ts
//
// `config.documentLimits`, enforced. Every create goes through `CollectionAPI.create`
// (the studio, REST, GraphQL and MCP are all wrappers around it), so checking here
// means a plan's limit holds however a document is made.

import type { DatabaseAdapter } from '../db/index';
import type {
	DocumentLimitResolver,
	MemberLimitResolver,
	StorageLimitResolver
} from '../types/config';
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

// ---------- storage ----------

/** An upload would take an organization over the bytes its limit allows. */
export class StorageLimitError extends Error {
	constructor(
		message: string,
		readonly maxBytes: number
	) {
		super(message);
		this.name = 'StorageLimitError';
	}
}

function megabytes(bytes: number): string {
	return bytes >= 1024 ** 3
		? `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`
		: `${Math.round(bytes / 1024 ** 2)} MB`;
}

/**
 * `config.storageLimits`, before an upload of `adding` bytes. Throws
 * `StorageLimitError` when the organization's total would go over the limit.
 */
export async function assertStorageLimit(
	resolve: StorageLimitResolver | undefined,
	organizationId: string,
	adding: number,
	adapter: Pick<DatabaseAdapter, 'getTotalAssetsSize'>
): Promise<void> {
	if (!resolve) return;
	const limit = await resolve({ organizationId });
	if (!limit) return;
	const used = Number(await adapter.getTotalAssetsSize(organizationId)) || 0;
	if (used + adding > limit.maxBytes) {
		throw new StorageLimitError(
			limit.message ??
				`This upload would go over this organization's ${megabytes(limit.maxBytes)} of storage. Delete some files, or raise the limit.`,
			limit.maxBytes
		);
	}
}

// ---------- members ----------

/** An organization has as many members (and pending invitations) as its limit allows. */
export class MemberLimitError extends Error {
	constructor(
		message: string,
		readonly max: number
	) {
		super(message);
		this.name = 'MemberLimitError';
	}
}

/**
 * `config.memberLimits`. `pending` counts invitations not yet accepted, for a new
 * invitation; leave it 0 when one is being accepted, which only needs a free seat.
 */
export async function assertMemberLimit(
	resolve: MemberLimitResolver | undefined,
	organizationId: string,
	adapter: Pick<DatabaseAdapter, 'findOrganizationMembers'>,
	pending = 0
): Promise<void> {
	if (!resolve) return;
	const limit = await resolve({ organizationId });
	if (!limit) return;
	const members = (await adapter.findOrganizationMembers(organizationId)).length;
	if (members + pending >= limit.max) {
		throw new MemberLimitError(
			limit.message ??
				`This organization has room for ${limit.max} ${limit.max === 1 ? 'person' : 'people'}, invitations included.`,
			limit.max
		);
	}
}

/**
 * Whether `error` is one of these limits. By name, not `instanceof`: a plugin and
 * core can load as two copies of cms-core.
 */
export function isLimitError(
	error: unknown
): error is DocumentLimitError | StorageLimitError | MemberLimitError {
	return (
		error instanceof Error &&
		(error.name === 'DocumentLimitError' ||
			error.name === 'StorageLimitError' ||
			error.name === 'MemberLimitError')
	);
}
