import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../src/lib/db/index';
import type { Where } from '../src/lib/types/filters';
import { createDocumentLimitGuard, DocumentLimitError } from '../src/lib/local-api/limits';

/** The one adapter method the guard uses, answering a fixed count. */
function countingAdapter(
	count: number,
	seen: Array<Where | undefined> = []
): Pick<DatabaseAdapter, 'countDocuments'> {
	return {
		countDocuments: async (_organizationId, _type, where) => {
			seen.push(where);
			return count;
		}
	};
}

const member = { organizationId: 'org-1' };

describe('documentLimits', () => {
	it('allows a create under the limit', async () => {
		const guard = createDocumentLimitGuard(() => ({ max: 5 }));
		await expect(guard(member, 'invoice', countingAdapter(4))).resolves.toBeUndefined();
	});

	it('refuses a create at the limit, with the configured message', async () => {
		const guard = createDocumentLimitGuard(() => ({ max: 5, message: 'Upgrade for more.' }));
		const attempt = guard(member, 'invoice', countingAdapter(5));
		await expect(attempt).rejects.toBeInstanceOf(DocumentLimitError);
		await expect(attempt).rejects.toThrow('Upgrade for more.');
	});

	it('counts from `since` for a per-period limit', async () => {
		const since = new Date('2026-11-01T00:00:00Z');
		const seen: Array<Where | undefined> = [];
		const guard = createDocumentLimitGuard(() => ({ max: 5, since }));
		await guard(member, 'invoice', countingAdapter(0, seen));
		expect(seen).toEqual([{ createdAt: { greater_than_equal: since } }]);
	});

	it('has no limit when the resolver returns null, and asks for no count', async () => {
		const guard = createDocumentLimitGuard(() => null);
		await expect(guard(member, 'invoice', countingAdapter(999))).resolves.toBeUndefined();
	});

	it("doesn't limit system writes", async () => {
		const guard = createDocumentLimitGuard(() => ({ max: 0 }));
		await expect(
			guard({ ...member, overrideAccess: true }, 'invoice', countingAdapter(10))
		).resolves.toBeUndefined();
	});
});
