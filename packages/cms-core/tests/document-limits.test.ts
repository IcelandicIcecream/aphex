import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../src/lib/db/index';
import type { Where } from '../src/lib/types/filters';
import {
	assertMemberLimit,
	assertStorageLimit,
	createDocumentLimitGuard,
	DocumentLimitError,
	isLimitError,
	MemberLimitError,
	StorageLimitError
} from '../src/lib/local-api/limits';

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

const MB = 1024 * 1024;
const sized = (bytes: number) => ({ getTotalAssetsSize: async () => bytes });
const withMembers = (count: number) => ({
	findOrganizationMembers: async () => Array.from({ length: count }) as never[]
});

describe('storageLimits', () => {
	it('allows an upload that fits', async () => {
		await expect(
			assertStorageLimit(() => ({ maxBytes: 250 * MB }), 'org-1', 10 * MB, sized(240 * MB))
		).resolves.toBeUndefined();
	});

	it('refuses an upload that would go over, with the configured message', async () => {
		const attempt = assertStorageLimit(
			() => ({ maxBytes: 250 * MB, message: 'Upgrade for more room.' }),
			'org-1',
			11 * MB,
			sized(240 * MB)
		);
		await expect(attempt).rejects.toBeInstanceOf(StorageLimitError);
		await expect(attempt).rejects.toThrow('Upgrade for more room.');
	});

	it('names the limit when no message is given', async () => {
		await expect(
			assertStorageLimit(() => ({ maxBytes: 250 * MB }), 'org-1', 1, sized(250 * MB))
		).rejects.toThrow('250 MB');
	});

	it('asks the resolver per organization, and has no limit on null', async () => {
		const asked: string[] = [];
		const resolve = ({ organizationId }: { organizationId: string }) => {
			asked.push(organizationId);
			return organizationId === 'free' ? { maxBytes: 1 } : null;
		};
		await expect(assertStorageLimit(resolve, 'pro', 10 * MB, sized(0))).resolves.toBeUndefined();
		await expect(assertStorageLimit(resolve, 'free', 10, sized(0))).rejects.toBeInstanceOf(
			StorageLimitError
		);
		expect(asked).toEqual(['pro', 'free']);
	});

	it('does nothing without a resolver', async () => {
		await expect(assertStorageLimit(undefined, 'org-1', 10, sized(1e12))).resolves.toBeUndefined();
	});
});

describe('memberLimits', () => {
	it('counts pending invitations for a new invitation', async () => {
		const resolve = () => ({ max: 3 });
		await expect(assertMemberLimit(resolve, 'org-1', withMembers(1), 1)).resolves.toBeUndefined();
		await expect(assertMemberLimit(resolve, 'org-1', withMembers(2), 1)).rejects.toBeInstanceOf(
			MemberLimitError
		);
	});

	it('refuses accepting into a full organization', async () => {
		const attempt = assertMemberLimit(
			() => ({ max: 1, message: 'One person on Free.' }),
			'org-1',
			withMembers(1)
		);
		await expect(attempt).rejects.toThrow('One person on Free.');
	});

	it('has no limit on null', async () => {
		await expect(
			assertMemberLimit(() => null, 'org-1', withMembers(500), 9)
		).resolves.toBeUndefined();
	});
});

describe('isLimitError', () => {
	it('knows each limit by name, so a second copy of core still matches', () => {
		expect(isLimitError(new DocumentLimitError('x', 'invoice', 1))).toBe(true);
		expect(isLimitError(new StorageLimitError('x', 1))).toBe(true);
		expect(isLimitError(new MemberLimitError('x', 1))).toBe(true);
		expect(isLimitError(Object.assign(new Error('x'), { name: 'StorageLimitError' }))).toBe(true);
		expect(isLimitError(new Error('x'))).toBe(false);
	});
});
