/**
 * File Upload & Reference API tests
 * Tests uploading a file, creating a document with a file reference,
 * and retrieving the file via the local API.
 *
 * Run: pnpm test file-upload-api
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { AssetService } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_ORG_ID = 'e57d5255-85e0-4ade-a294-17d60815b130';

let localAPI: ReturnType<typeof createLocalAPI>;
let assetService: AssetService;

// Track IDs for cleanup
let createdDocId: string | null = null;
let createdAssetId: string | null = null;

// Use the local storage adapter for tests
import { createStorageAdapter } from '@aphexcms/cms-core/server';

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	const storageAdapter = cmsConfig.storage ?? createStorageAdapter('local', {
		basePath: './storage/assets',
		baseUrl: ''
	});
	assetService = new AssetService(storageAdapter, db);
}, 30000);

// afterAll(async () => {
// 	// Clean up document
// 	if (createdDocId) {
// 		try {
// 			await localAPI.collections.dataImport.delete(
// 				{ organizationId: TEST_ORG_ID, overrideAccess: true },
// 				createdDocId
// 			);
// 		} catch (e) {
// 			// Ignore
// 		}
// 	}
// 	// Clean up asset
// 	if (createdAssetId) {
// 		try {
// 			await assetService.deleteAsset(TEST_ORG_ID, createdAssetId);
// 		} catch (e) {
// 			// Ignore
// 		}
// 	}
// });

describe('File Upload & Reference via Local API', () => {
	it('should upload a text file and get an asset back', async () => {
		const filePath = join(process.cwd(), '../../transcript-test.txt');
		const fileBuffer = readFileSync(filePath);

		const asset = await assetService.uploadAsset(TEST_ORG_ID, {
			buffer: fileBuffer,
			originalFilename: 'transcript-test.txt',
			mimeType: 'text/plain',
			size: fileBuffer.length
		});

		createdAssetId = asset.id;

		expect(asset.id).toBeDefined();
		expect(asset.assetType).toBe('file');
		expect(asset.originalFilename).toBe('transcript-test.txt');
		expect(asset.mimeType).toBe('text/plain');
		expect(asset.size).toBe(fileBuffer.length);
		expect(asset.url).toBeDefined();
	});

	it('should create a dataImport document with a file reference', async () => {
		expect(createdAssetId).not.toBeNull();

		const result = await localAPI.collections.dataImport.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{
				title: 'Test File Upload',
				file: {
					_type: 'file',
					asset: {
						_type: 'reference',
						_ref: createdAssetId!
					}
				}
			}
		);

		const doc = result.document;
		createdDocId = doc.id;

		expect(doc.id).toBeDefined();
		expect(doc.title).toBe('Test File Upload');
		expect(doc.file).toBeDefined();
		expect(doc.file._type).toBe('file');
		expect(doc.file.asset._ref).toBe(createdAssetId);
	});

	it('should retrieve the document and resolve the file asset', async () => {
		expect(createdDocId).not.toBeNull();
		expect(createdAssetId).not.toBeNull();

		// Fetch the document
		const doc = await localAPI.collections.dataImport.findByID(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			createdDocId!
		);

		expect(doc).not.toBeNull();
		expect(doc!.title).toBe('Test File Upload');
		expect(doc!.file).toBeDefined();
		expect(doc!.file.asset._ref).toBe(createdAssetId);

		// Resolve the asset from the reference
		const assetId = doc!.file.asset._ref;
		const asset = await assetService.findAssetById(TEST_ORG_ID, assetId);

		expect(asset).not.toBeNull();
		expect(asset!.id).toBe(createdAssetId);
		expect(asset!.originalFilename).toBe('transcript-test.txt');
		expect(asset!.mimeType).toBe('text/plain');
		expect(asset!.url).toBeDefined();
		expect(asset!.url.length).toBeGreaterThan(0);
	});

	it('should list dataImport documents and find the file reference', async () => {
		const result = await localAPI.collections.dataImport.find(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{ limit: 10 }
		);

		expect(result.docs.length).toBeGreaterThan(0);

		const ourDoc = result.docs.find((d: any) => d.id === createdDocId);
		expect(ourDoc).toBeDefined();
		expect(ourDoc!.file).toBeDefined();
		expect(ourDoc!.file.asset._ref).toBe(createdAssetId);
	});
});
