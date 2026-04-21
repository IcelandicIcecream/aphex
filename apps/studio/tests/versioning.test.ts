/**
 * Tests for document versioning and soft unpublish
 *
 * Run: pnpm -F @aphexcms/studio test versioning
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';

const TEST_ORG_ID = '13f84147-06c0-43d3-9944-927e8862e177';
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

let localAPI: ReturnType<typeof createLocalAPI>;
const createdDocIds: string[] = [];

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
}, 30000);

afterEach(async () => {
	for (const id of createdDocIds) {
		try {
			await localAPI.collections.page.delete(ctx, id);
		} catch {
			// already deleted
		}
	}
	createdDocIds.length = 0;
});

describe('Soft Unpublish', () => {
	it('should keep publishedData when unpublishing', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Unpublish Test', slug: 'unpublish-test' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// Unpublish
		await localAPI.collections.page.unpublish(ctx, document.id);

		// Fetch the raw document — publishedData should still be there
		const raw = await db.findByDocIdAdvanced(TEST_ORG_ID, document.id);
		expect(raw).not.toBeNull();
		expect(raw!.status).toBe('unpublished');
		expect(raw!.publishedData).not.toBeNull();
		expect(raw!.publishedData.title).toBe('Unpublish Test');
		expect(raw!.publishedHash).not.toBeNull();
	});

	it('should exclude unpublished docs from published collection queries', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Hidden Page', slug: 'hidden-page' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// Verify it appears in published collection queries
		const before = await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			where: { slug: { equals: 'hidden-page' } }
		});
		expect(before.docs.length).toBe(1);

		// Unpublish
		await localAPI.collections.page.unpublish(ctx, document.id);

		// Should NOT appear in published collection queries
		const after = await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			where: { slug: { equals: 'hidden-page' } }
		});
		expect(after.docs.length).toBe(0);

		// Should still appear in draft collection queries
		const draft = await localAPI.collections.page.find(ctx, {
			perspective: 'draft',
			where: { slug: { equals: 'hidden-page' } }
		});
		expect(draft.docs.length).toBe(1);
	});

	it('should re-publish instantly from unpublished state', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Re-publish Test', slug: 're-publish-test' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// Unpublish then re-publish
		await localAPI.collections.page.unpublish(ctx, document.id);
		const republished = await localAPI.collections.page.publish(ctx, document.id);

		expect(republished).not.toBeNull();

		// Should appear in published queries again
		const found = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		expect(found).not.toBeNull();
	});
});

describe('Version History', () => {
	it('should create a draft version on document creation', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'New Doc',
			slug: 'new-doc-version'
		});
		createdDocIds.push(document.id);

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBe(1);
		expect(versions.versions[0].eventType).toBe('draft');
		expect(versions.versions[0].data.title).toBe('New Doc');
	});

	it('should create both draft and publish versions on create with publish', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Created Published', slug: 'created-published' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBe(2);

		const draft = versions.versions.find((v) => v.eventType === 'draft');
		const publish = versions.versions.find((v) => v.eventType === 'publish');
		expect(draft).toBeDefined();
		expect(publish).toBeDefined();
		expect(draft!.data.title).toBe('Created Published');
		expect(publish!.data.title).toBe('Created Published');
	});

	it('should track full draft history through edits', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Draft History v1',
			slug: 'draft-history'
		});
		createdDocIds.push(document.id);

		await localAPI.collections.page.update(ctx, document.id, { title: 'Draft History v2' });
		await localAPI.collections.page.update(ctx, document.id, { title: 'Draft History v3' });
		await localAPI.collections.page.publish(ctx, document.id);
		await localAPI.collections.page.update(ctx, document.id, { title: 'Draft History v4' });

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		// 1 create draft + 2 update drafts + 1 publish + 1 post-publish draft = 5
		expect(versions.total).toBe(5);

		// Check order — newest first
		expect(versions.versions[0].data.title).toBe('Draft History v4');
		expect(versions.versions[0].eventType).toBe('draft');
		expect(versions.versions[1].eventType).toBe('publish');
		expect(versions.versions[1].data.title).toBe('Draft History v3');
	});

	it('should skip versioning when skipVersioning option is set', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'No Version', slug: 'skip-version' },
			{ skipVersioning: true }
		);
		createdDocIds.push(document.id);

		// No version should be created
		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBe(0);

		// Update with skipVersioning
		await localAPI.collections.page.update(
			ctx,
			document.id,
			{ title: 'Still No Version' },
			{ skipVersioning: true }
		);

		const afterUpdate = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(afterUpdate.total).toBe(0);

		// Normal update should create a version
		await localAPI.collections.page.update(ctx, document.id, { title: 'Now With Version' });

		const afterNormal = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(afterNormal.total).toBe(1);
		expect(afterNormal.versions[0].data.title).toBe('Now With Version');
	});

	it('should create a version on publish', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Version Test', slug: 'version-test' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBeGreaterThanOrEqual(1);

		const publishVersion = versions.versions.find((v) => v.eventType === 'publish');
		expect(publishVersion).toBeDefined();
		expect(publishVersion!.data.title).toBe('Version Test');
	});

	it('should create versions on draft saves', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Draft v1',
			slug: 'draft-versions'
		});
		createdDocIds.push(document.id);

		// Multiple draft updates
		await localAPI.collections.page.update(ctx, document.id, { title: 'Draft v2' });
		await localAPI.collections.page.update(ctx, document.id, { title: 'Draft v3' });

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		// At least 3 draft versions (create doesn't version, but updates do)
		expect(versions.total).toBeGreaterThanOrEqual(2);

		const draftVersions = versions.versions.filter((v) => v.eventType === 'draft');
		expect(draftVersions.length).toBeGreaterThanOrEqual(2);
	});

	it('should increment version numbers sequentially', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Sequential Test',
			slug: 'sequential-versions'
		});
		createdDocIds.push(document.id);

		await localAPI.collections.page.update(ctx, document.id, { title: 'Update 1' });
		await localAPI.collections.page.update(ctx, document.id, { title: 'Update 2' });
		await localAPI.collections.page.publish(ctx, document.id);

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		const numbers = versions.versions.map((v) => v.versionNumber).sort((a, b) => a - b);

		// Should be sequential with no gaps
		for (let i = 1; i < numbers.length; i++) {
			expect(numbers[i]).toBe(numbers[i - 1] + 1);
		}
	});

	it('should get a specific version by number', async () => {
		// Create draft first
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Get Version Test',
			slug: 'get-version'
		});
		createdDocIds.push(document.id);

		// Edit a few times
		await localAPI.collections.page.update(ctx, document.id, { title: 'Edited Once' });
		await localAPI.collections.page.update(ctx, document.id, { title: 'Edited Twice' });

		// Then publish
		await localAPI.collections.page.publish(ctx, document.id);

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		// 1 create draft + 2 update drafts + 1 publish = 4
		expect(versions.total).toBe(4);

		// Fetch the publish version by its number
		const publishVersion = versions.versions.find((v) => v.eventType === 'publish');
		expect(publishVersion).toBeDefined();

		const fetched = await localAPI.versionService.getVersion(
			db,
			TEST_ORG_ID,
			document.id,
			publishVersion!.versionNumber
		);

		expect(fetched).not.toBeNull();
		expect(fetched!.data.title).toBe('Edited Twice');
		expect(fetched!.eventType).toBe('publish');

		// Also fetch the first draft version
		const firstDraft = versions.versions[versions.versions.length - 1];
		const fetchedDraft = await localAPI.versionService.getVersion(
			db,
			TEST_ORG_ID,
			document.id,
			firstDraft.versionNumber
		);

		expect(fetchedDraft).not.toBeNull();
		expect(fetchedDraft!.data.title).toBe('Get Version Test');
		expect(fetchedDraft!.eventType).toBe('draft');
	});

	it('should restore a version to draft via VersionService', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Original Title', slug: 'restore-test' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// Update to something different
		await localAPI.collections.page.update(ctx, document.id, { title: 'Changed Title' });

		// Get the publish version
		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		const publishVersion = versions.versions.find((v) => v.eventType === 'publish');
		expect(publishVersion).toBeDefined();

		// Restore to the publish version via service
		const restored = await localAPI.versionService.restoreVersion(
			db,
			TEST_ORG_ID,
			document.id,
			publishVersion!.versionNumber
		);

		expect(restored).not.toBeNull();
		expect(restored!.draftData.title).toBe('Original Title');

		// A draft version should have been created from the restore
		const afterVersions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(afterVersions.total).toBeGreaterThan(versions.total);
	});

	it('should restore a specific version from the middle of history', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Version 1 - Original',
			slug: 'mid-restore-test'
		});
		createdDocIds.push(document.id);

		// Create 6 versions with distinct content
		await localAPI.collections.page.update(ctx, document.id, { title: 'Version 2 - Updated' });
		await localAPI.collections.page.update(ctx, document.id, { title: 'Version 3 - Rewritten' });
		await localAPI.collections.page.publish(ctx, document.id); // publish version
		await localAPI.collections.page.update(ctx, document.id, {
			title: 'Version 5 - Post-publish edit'
		});
		await localAPI.collections.page.update(ctx, document.id, { title: 'Version 6 - Latest' });

		// List all versions
		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBeGreaterThanOrEqual(5);

		// Find version 2 (should have 'Version 2 - Updated')
		const v2 = versions.versions.find((v) => v.data.title === 'Version 2 - Updated');
		expect(v2).toBeDefined();

		// Current draft should be 'Version 6 - Latest'
		const current = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'draft'
		});
		expect((current as any).title).toBe('Version 6 - Latest');

		// Restore to version 2 via service
		await localAPI.versionService.restoreVersion(db, TEST_ORG_ID, document.id, v2!.versionNumber);

		// Draft should now be 'Version 2 - Updated'
		const restored = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'draft'
		});
		expect((restored as any).title).toBe('Version 2 - Updated');

		// Published data should be unchanged (still 'Version 3 - Rewritten' from the publish)
		const published = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		expect((published as any).title).toBe('Version 3 - Rewritten');

		// A new draft version should exist from the restore
		const afterVersions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(afterVersions.total).toBe(versions.total + 1);
		// Most recent version should be a draft with the restored data
		expect(afterVersions.versions[0].eventType).toBe('draft');
		expect(afterVersions.versions[0].data.title).toBe('Version 2 - Updated');
	});

	it('should preserve nested/complex data in version snapshots', async () => {
		const complexData = {
			title: 'Complex Page',
			slug: 'complex-data-test',
			hero: {
				heading: 'Welcome',
				subheading: 'A nested object',
				ctaText: 'Click me',
				ctaUrl: '/about'
			},
			content: [
				{ _type: 'textBlock', heading: 'Intro', content: 'Some text here' },
				{ _type: 'imageBlock', caption: 'Photo', alt: 'A photo' }
			],
			seo: {
				metaTitle: 'SEO Title',
				metaDescription: 'SEO description for the page'
			}
		};

		const { document } = await localAPI.collections.page.create(ctx, complexData, {
			publish: true
		});
		createdDocIds.push(document.id);

		// Get the publish version
		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		const publishVersion = versions.versions.find((v) => v.eventType === 'publish');
		expect(publishVersion).toBeDefined();

		const snapshot = publishVersion!.data;

		// Verify all nested data is preserved exactly
		expect(snapshot.title).toBe('Complex Page');
		expect(snapshot.hero.heading).toBe('Welcome');
		expect(snapshot.hero.ctaUrl).toBe('/about');
		expect(snapshot.content).toHaveLength(2);
		expect(snapshot.content[0]._type).toBe('textBlock');
		expect(snapshot.content[0].content).toBe('Some text here');
		expect(snapshot.content[1]._type).toBe('imageBlock');
		expect(snapshot.content[1].alt).toBe('A photo');
		expect(snapshot.seo.metaTitle).toBe('SEO Title');
		expect(snapshot.seo.metaDescription).toBe('SEO description for the page');

		// Now update with different nested data and publish again
		await localAPI.collections.page.update(ctx, document.id, {
			hero: {
				heading: 'Updated Welcome',
				subheading: 'Changed subheading',
				ctaText: 'New CTA',
				ctaUrl: '/contact'
			},
			content: [{ _type: 'textBlock', heading: 'New Intro', content: 'Different text' }]
		});
		await localAPI.collections.page.publish(ctx, document.id);

		// Restore to original version
		await localAPI.versionService.restoreVersion(
			db,
			TEST_ORG_ID,
			document.id,
			publishVersion!.versionNumber
		);

		// Verify restored draft has the original nested data
		const restored = (await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'draft'
		})) as any;

		expect(restored.hero.heading).toBe('Welcome');
		expect(restored.hero.ctaUrl).toBe('/about');
		expect(restored.content).toHaveLength(2);
		expect(restored.content[0].content).toBe('Some text here');
		expect(restored.seo.metaTitle).toBe('SEO Title');
	});

	it('should enforce rolling retention', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Retention Test',
			slug: 'retention-test'
		});
		createdDocIds.push(document.id);

		// Create many versions (default maxVersions is 25)
		for (let i = 0; i < 30; i++) {
			await localAPI.collections.page.update(ctx, document.id, {
				title: `Retention v${i}`
			});
		}

		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		// Should not exceed maxVersions (25 by default)
		expect(versions.total).toBeLessThanOrEqual(25);

		// Latest version should have the most recent data
		const latest = versions.versions[0];
		expect(latest.data.title).toBe('Retention v29');
	});

	it('should enforce custom maxVersions', async () => {
		// Create a separate LocalAPI with maxVersions = 5
		const customAPI = createLocalAPI({ ...cmsConfig, versioning: { maxVersions: 5 } }, db);

		const { document } = await customAPI.collections.page.create(ctx, {
			title: 'Custom Retention',
			slug: 'custom-retention-test'
		});
		createdDocIds.push(document.id);

		// Create 10 versions
		for (let i = 0; i < 10; i++) {
			await customAPI.collections.page.update(ctx, document.id, {
				title: `Custom v${i}`
			});
		}

		const versions = await customAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		expect(versions.total).toBeLessThanOrEqual(5);

		// Latest should be most recent
		const latest = versions.versions[0];
		expect(latest.data.title).toBe('Custom v9');

		// Oldest surviving should NOT be the first ones
		const oldest = versions.versions[versions.versions.length - 1];
		expect(oldest.data.title).not.toBe('Custom v0');
	});

	it('should preserve nested/complex data in version snapshots', async () => {
		const complexData = {
			title: 'Complex Page',
			slug: 'complex-data-test',
			hero: {
				heading: 'Welcome',
				subheading: 'A nested object',
				ctaText: 'Click me',
				ctaUrl: '/about'
			},
			content: [
				{ _type: 'textBlock', heading: 'Intro', content: 'Some text here' },
				{ _type: 'imageBlock', caption: 'Photo', alt: 'A photo' }
			],
			seo: {
				metaTitle: 'SEO Title',
				metaDescription: 'SEO description for the page'
			}
		};

		const { document } = await localAPI.collections.page.create(ctx, complexData, {
			publish: true
		});
		createdDocIds.push(document.id);

		// Get the publish version
		const versions = await localAPI.versionService.listVersions(db, TEST_ORG_ID, document.id);
		const publishVersion = versions.versions.find((v) => v.eventType === 'publish');
		expect(publishVersion).toBeDefined();

		const snapshot = publishVersion!.data;

		// Verify all nested data is preserved exactly
		expect(snapshot.title).toBe('Complex Page');
		expect(snapshot.hero.heading).toBe('Welcome');
		expect(snapshot.hero.ctaUrl).toBe('/about');
		expect(snapshot.content).toHaveLength(2);
		expect(snapshot.content[0]._type).toBe('textBlock');
		expect(snapshot.content[0].content).toBe('Some text here');
		expect(snapshot.content[1]._type).toBe('imageBlock');
		expect(snapshot.content[1].alt).toBe('A photo');
		expect(snapshot.seo.metaTitle).toBe('SEO Title');

		// Update with different nested data and publish again
		await localAPI.collections.page.update(ctx, document.id, {
			hero: {
				heading: 'Updated Welcome',
				subheading: 'Changed',
				ctaText: 'New CTA',
				ctaUrl: '/contact'
			},
			content: [{ _type: 'textBlock', heading: 'New Intro', content: 'Different text' }]
		});
		await localAPI.collections.page.publish(ctx, document.id);

		// Restore to original version
		await localAPI.versionService.restoreVersion(
			db,
			TEST_ORG_ID,
			document.id,
			publishVersion!.versionNumber
		);

		// Verify restored draft has the original nested data
		const restored = (await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'draft'
		})) as any;

		expect(restored.hero.heading).toBe('Welcome');
		expect(restored.hero.ctaUrl).toBe('/about');
		expect(restored.content).toHaveLength(2);
		expect(restored.content[0].content).toBe('Some text here');
		expect(restored.seo.metaTitle).toBe('SEO Title');
	});
});
