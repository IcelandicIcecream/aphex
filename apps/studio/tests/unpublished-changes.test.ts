/**
 * `_meta.hasUnpublishedChanges` on draft reads of a published document: the one
 * signal a reader without the editor (an MCP agent) has that the draft and the
 * live site differ, since `status` stays 'published' after an edit.
 *
 * Run: pnpm -F @aphexcms/studio test unpublished-changes
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
let localAPI: ReturnType<typeof createLocalAPI>;
const created: string[] = [];

beforeAll(() => {
	localAPI = createLocalAPI(cmsConfig, db);
});

afterAll(async () => {
	for (const id of created) await localAPI.collections.page.delete(ctx, id).catch(() => {});
});

const meta = async (id: string, perspective: 'draft' | 'published' = 'draft') => {
	const doc = await localAPI.collections.page.findByID(ctx, id, { perspective });
	return doc?._meta;
};

describe('hasUnpublishedChanges', () => {
	it('is false right after publishing, true after a draft edit, false again once published', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Live page', slug: 'unpublished-changes-live' },
			{ publish: true }
		);
		created.push(document.id);
		expect(await meta(document.id)).toMatchObject({
			status: 'published',
			hasUnpublishedChanges: false
		});

		await localAPI.collections.page.update(ctx, document.id, { title: 'Live page, edited' });
		expect(await meta(document.id)).toMatchObject({
			status: 'published',
			hasUnpublishedChanges: true
		});

		await localAPI.collections.page.publish(ctx, document.id);
		expect((await meta(document.id))?.hasUnpublishedChanges).toBe(false);
	});

	it('is left out where it means nothing: a never-published draft, and published reads', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Draft page',
			slug: 'unpublished-changes-draft'
		});
		created.push(document.id);
		const draft = await meta(document.id);
		expect(draft?.status).toBe('draft');
		expect(draft).not.toHaveProperty('hasUnpublishedChanges');

		await localAPI.collections.page.publish(ctx, document.id);
		expect(await meta(document.id, 'published')).not.toHaveProperty('hasUnpublishedChanges');
	});
});
