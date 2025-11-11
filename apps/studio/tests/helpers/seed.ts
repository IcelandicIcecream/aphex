/**
 * Shared seeding helper for tests
 */
import type { LocalAPI } from '@aphexcms/cms-core/server';
import { testData } from '../fixtures/test-data';

const TEST_ORG_ID = '8a5c55fe-f89e-4e73-93b3-aba660e8e26b';

export async function seedDatabase(localAPI: LocalAPI) {
	// Clear existing test data
	const { docs: pages } = await localAPI.collections.page.find(
		{ organizationId: TEST_ORG_ID, overrideAccess: true },
		{ limit: 1000 }
	);
	for (const doc of pages) {
		await localAPI.collections.page.delete(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			doc.id
		);
	}

	const { docs: catalogs } = await localAPI.collections.catalog.find(
		{ organizationId: TEST_ORG_ID, overrideAccess: true },
		{ limit: 1000 }
	);
	for (const doc of catalogs) {
		await localAPI.collections.catalog.delete(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			doc.id
		);
	}

	const { docs: movies } = await localAPI.collections.movie.find(
		{ organizationId: TEST_ORG_ID, overrideAccess: true },
		{ limit: 1000 }
	);
	for (const doc of movies) {
		await localAPI.collections.movie.delete(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			doc.id
		);
	}

	// Seed pages
	for (const { data, publish } of testData.pages) {
		await localAPI.collections.page.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			data,
			{ publish }
		);
	}

	// Seed catalogs
	for (const { data, publish } of testData.catalogs) {
		await localAPI.collections.catalog.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			data,
			{ publish }
		);
	}

	// Seed movies
	for (const { data, publish } of testData.movies) {
		await localAPI.collections.movie.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			data,
			{ publish }
		);
	}
}
