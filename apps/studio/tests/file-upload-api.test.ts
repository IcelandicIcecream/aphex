/**
 * File Upload & Reference API tests
 * Tests uploading a file, creating a document with a file reference,
 * and retrieving the file via the local API.
 *
 * Run: pnpm test file-upload-api
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { AssetService } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';
import type { StorageAdapter } from '@aphexcms/cms-core/server';

let localAPI: ReturnType<typeof createLocalAPI>;
let assetService: AssetService;
let storageAdapter: StorageAdapter;

// Track IDs for cleanup
let createdDocId: string | null = null;
let createdAssetId: string | null = null;

// Use the local storage adapter for tests
import { createStorageAdapter } from '@aphexcms/cms-core/server';

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	storageAdapter =
		cmsConfig.storage ??
		createStorageAdapter('local', {
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
	it('enforces the global MIME allow-list outside HTTP routes', async () => {
		const pdfOnlyService = new AssetService(storageAdapter, db, null, ['application/pdf']);
		const buffer = Buffer.from('plain text', 'utf8');

		await expect(
			pdfOnlyService.uploadAsset(TEST_ORG_ID, {
				buffer,
				originalFilename: 'notes.txt',
				mimeType: 'text/plain',
				size: buffer.length
			})
		).rejects.toThrow('application/pdf');
	});

	it('rejects disguised direct-upload bytes and prevents confirmation replay', async () => {
		const objects = new Map<string, Buffer>();
		const directStorage: StorageAdapter = {
			name: 'test-memory',
			async store(data) {
				const key = data.key ?? data.filename;
				objects.set(key, data.buffer);
				return { key, path: key, url: `/media/${key}`, size: data.size };
			},
			async delete(path) {
				return objects.delete(path);
			},
			async exists(path) {
				return objects.has(path);
			},
			getUrl(path) {
				return `/media/${path}`;
			},
			async getObject(path) {
				const object = objects.get(path);
				if (!object) throw new Error('Not found');
				return object;
			},
			async getObjectRange(path, start, end) {
				const object = objects.get(path);
				if (!object) throw new Error('Not found');
				return new ReadableStream({
					start(controller) {
						controller.enqueue(object.subarray(start, end + 1));
						controller.close();
					}
				});
			},
			async getObjectMetadata(path) {
				const object = objects.get(path);
				if (!object) throw new Error('Not found');
				return { key: path, size: object.length, lastModified: new Date() };
			},
			async copyObject(sourcePath, destPath) {
				const object = objects.get(sourcePath);
				if (!object) return false;
				objects.set(destPath, Buffer.from(object));
				return true;
			},
			resolvePath(key) {
				return key;
			},
			async getStorageInfo() {
				return { totalSize: [...objects.values()].reduce((sum, value) => sum + value.length, 0) };
			}
		};
		const securedService = new AssetService(directStorage, db, null, ['image/*']);
		const assetId = crypto.randomUUID();
		const key = `${assetId}/pending-test.png`;
		const finalKey = `${assetId}/original.png`;
		const buffer = Buffer.from('<!doctype html><script>alert(1)</script>');
		await directStorage.store({
			buffer,
			filename: 'photo.png',
			mimeType: 'image/png',
			size: buffer.length,
			key
		});

		await expect(
			securedService.finalizeDirectUpload(
				TEST_ORG_ID,
				{
					assetId,
					key,
					finalKey,
					originalFilename: 'photo.png',
					mimeType: 'image/png'
				},
				{ maxBytes: 1024 * 1024 }
			)
		).rejects.toThrow('text/html');

		const replayAssetId = crypto.randomUUID();
		const replayKey = `${replayAssetId}/pending-test.png`;
		const replayFinalKey = `${replayAssetId}/original.png`;
		const approvedBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		await directStorage.store({
			buffer: approvedBytes,
			filename: 'approved.png',
			mimeType: 'image/png',
			size: approvedBytes.length,
			key: replayKey
		});
		const replayIntent = {
			assetId: replayAssetId,
			key: replayKey,
			finalKey: replayFinalKey,
			originalFilename: 'approved.png',
			mimeType: 'image/png'
		};
		await securedService.finalizeDirectUpload(TEST_ORG_ID, replayIntent, {
			maxBytes: 1024 * 1024
		});

		const replacementBytes = Buffer.concat([approvedBytes, Buffer.from('replacement')]);
		objects.set(replayKey, replacementBytes);
		await expect(
			securedService.finalizeDirectUpload(TEST_ORG_ID, replayIntent, {
				maxBytes: 1024 * 1024
			})
		).rejects.toThrow('already been confirmed');
		expect(objects.get(replayFinalKey)).toEqual(approvedBytes);

		await db.deleteAsset(TEST_ORG_ID, replayAssetId);
	});

	it('should upload a text file and get an asset back', async () => {
		const fileBuffer = Buffer.from('Test transcript content for upload tests.\n', 'utf8');

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
