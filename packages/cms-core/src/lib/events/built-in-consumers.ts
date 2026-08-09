// Core's own event consumers.
//
// These are ordinary `aphex/event/consumer` parts — the same contract a plugin author
// writes against — so they inherit the whole spine: the relay fans out to them, each
// delivery is a durable job, and a failure retries with backoff and eventually
// dead-letters. Core gets no privileged path, which also means the doctrine holds for
// core too: hooks transform, consumers react.
//
// They're seeded into the part resolver rather than registered by the app, so erasure
// happens on every install without anyone remembering to wire it.
import type { EventConsumerPart } from '../plugins/types';
import { userDeleted } from './catalog';

/** Extract the asset id from an avatar path, or null if it isn't one of ours. */
function avatarAssetId(image: string): string | null {
	return /^\/media\/([^/]+)\//.exec(image)?.[1] ?? null;
}

/**
 * Erase a deleted user's avatar — the file, not just the row.
 *
 * Account deletion removes the user record, and with it the only pointer to the avatar
 * asset. Without this the image survives in object storage indefinitely, reachable by
 * anyone holding its URL and invisible to the media browser (avatars are marked
 * `system`), so nothing would ever surface it for cleanup. That is precisely the
 * "personal data with no way left to find or erase it" case a right-to-erasure request
 * has to be able to answer.
 *
 * Idempotent, as every consumer must be: a missing asset is a completed erasure, so a
 * redelivery finds nothing and succeeds. It throws only when the delete itself fails, so
 * a transient storage outage retries with backoff instead of silently giving up — the
 * one outcome that would leave the data behind while reporting success.
 */
export const eraseUserAvatarConsumer: EventConsumerPart = {
	implements: 'aphex/event/consumer',
	id: 'aphex.erase-user-avatar',
	events: [userDeleted.type],
	async handler({ event, assetService, logger }) {
		const image = event.payload.image;
		if (typeof image !== 'string' || !image) return;

		const assetId = avatarAssetId(image);
		if (!assetId) {
			// An external provider's avatar, or one of the absolute storage URLs written
			// before avatars moved to `/media/<id>/`. Nothing of ours to delete, and no
			// asset id recoverable from it — flag it so it can be cleared by hand.
			logger.warn(
				'[erase-user-avatar]',
				`User ${event.payload.userId} had a non-asset avatar (${image}); nothing to erase automatically.`
			);
			return;
		}

		if (!assetService) {
			// Throwing would retry forever against a host that has no asset service at
			// all. Say so loudly once per attempt and let the delivery dead-letter.
			throw new Error(
				`Cannot erase avatar asset ${assetId}: no asset service is configured on this host.`
			);
		}

		const deleted = await assetService.deleteAsset(event.organizationId, assetId);
		logger.info(
			'[erase-user-avatar]',
			deleted
				? `Erased avatar asset ${assetId} for deleted user ${event.payload.userId}`
				: `Avatar asset ${assetId} was already gone for user ${event.payload.userId}`
		);
	}
};

/** Every consumer core ships. Seeded into the part resolver ahead of plugin parts. */
export const BUILT_IN_EVENT_CONSUMERS: readonly EventConsumerPart[] = [eraseUserAvatarConsumer];
