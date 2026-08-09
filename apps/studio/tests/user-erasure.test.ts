// Right-to-erasure spine: `user.deleted` → relay → built-in consumer → the avatar's
// file is gone, not just its row.
//
// The consumer is exercised directly rather than through a live worker tick, because
// what's worth pinning down is its *decisions*: which images it treats as ours, what it
// does when there's nothing to delete, and whether a storage failure retries or is
// swallowed. The wiring either side of it (relay fan-out, delivery-as-job) is already
// covered by the events+jobs block in the adapter conformance suite.
import { describe, it, expect, vi } from 'vitest';
import { createPartResolver } from '@aphexcms/cms-core';
import { eraseUserAvatarConsumer, userDeleted } from '@aphexcms/cms-core';
import type { ConsumedEvent } from '@aphexcms/cms-core';

const ORG = 'org-1';

function eventFor(payload: Record<string, unknown>): ConsumedEvent {
	return {
		id: 'evt-1',
		type: userDeleted.type,
		organizationId: ORG,
		payload,
		correlationId: null,
		causationId: null,
		createdBy: 'user-1',
		createdAt: new Date()
	};
}

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function run(payload: Record<string, unknown>, assetService: unknown) {
	return eraseUserAvatarConsumer.handler({
		event: eventFor(payload),
		// The consumer touches neither of these; typed loosely so the test doesn't
		// have to stand up an adapter it never calls.
		databaseAdapter: {} as never,
		logger: silentLogger as never,
		settings: { get: async () => ({}) },
		assetService: assetService as never,
		emailAdapter: null
	});
}

describe('user.deleted erasure consumer', () => {
	it('is registered as a built-in, with no plugins installed', () => {
		// Erasure has to happen on every install. If it only arrived with a plugin,
		// the default deployment would be the non-compliant one.
		const resolver = createPartResolver([]);
		const subscribed = resolver.consumersForEvent(userDeleted.type);
		expect(subscribed.map((c) => c.id)).toContain('aphex.erase-user-avatar');
	});

	it('deletes the asset behind a /media/ avatar', async () => {
		const deleteAsset = vi.fn().mockResolvedValue(true);
		await run(
			{ userId: 'user-1', email: 'a@b.c', image: '/media/asset-9/pic.png' },
			{
				findAssetById: vi.fn(),
				deleteAsset
			}
		);
		expect(deleteAsset).toHaveBeenCalledWith(ORG, 'asset-9');
	});

	it('is idempotent — a redelivery for an already-erased asset still succeeds', async () => {
		// At-least-once delivery means this runs more than once for the same event.
		// "Already gone" is a completed erasure, not a failure to retry forever.
		const deleteAsset = vi.fn().mockResolvedValue(false);
		await expect(
			run(
				{ userId: 'user-1', email: null, image: '/media/asset-9/pic.png' },
				{
					findAssetById: vi.fn(),
					deleteAsset
				}
			)
		).resolves.toBeUndefined();
	});

	it('leaves non-asset avatars alone', async () => {
		// An external provider's URL, or one of the absolute storage URLs written before
		// avatars moved to /media/<id>/. No asset id is recoverable, so there is nothing
		// to delete — and nothing that should be guessed at.
		const deleteAsset = vi.fn();
		for (const image of [
			'https://cdn.example.com/ben-dc-1.png',
			'https://lh3.googleusercontent.com/a/abc123',
			''
		]) {
			await run({ userId: 'user-1', email: null, image }, { findAssetById: vi.fn(), deleteAsset });
		}
		expect(deleteAsset).not.toHaveBeenCalled();
	});

	it('retries rather than silently dropping the file when storage fails', async () => {
		// The one outcome that must never look like success: reporting erasure while the
		// personal data is still sitting in object storage.
		const deleteAsset = vi.fn().mockRejectedValue(new Error('R2 unavailable'));
		await expect(
			run(
				{ userId: 'user-1', email: null, image: '/media/asset-9/pic.png' },
				{
					findAssetById: vi.fn(),
					deleteAsset
				}
			)
		).rejects.toThrow('R2 unavailable');
	});

	it('fails loudly when the host wired no asset service', async () => {
		await expect(
			run({ userId: 'user-1', email: null, image: '/media/asset-9/pic.png' }, null)
		).rejects.toThrow(/no asset service/i);
	});
});

describe('user.deleted event contract', () => {
	it('carries the image, because nothing can look it up afterwards', () => {
		// The account row is gone by the time a consumer runs, taking the only pointer
		// to the avatar with it.
		const parsed = userDeleted.parse({
			userId: 'user-1',
			email: 'a@b.c',
			image: '/media/asset-9/pic.png'
		});
		expect(parsed).toEqual({
			userId: 'user-1',
			email: 'a@b.c',
			image: '/media/asset-9/pic.png'
		});
	});

	it('rejects a payload missing the image field rather than defaulting it', () => {
		// Defaulting to null would turn "we forgot to capture it" into "there wasn't one",
		// which is an erasure that silently does nothing.
		expect(() => userDeleted.parse({ userId: 'user-1', email: null })).toThrow();
	});
});
