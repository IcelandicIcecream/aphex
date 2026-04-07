import type { StorageAdapter } from '@aphexcms/cms-core/server';
import { s3Storage } from '@aphexcms/storage-s3';
import type { CloudCredentials } from '../client.js';

/**
 * Create a StorageAdapter from cloud-provisioned credentials.
 */
export function createCloudStorageAdapter(
	credentials: CloudCredentials['storage']
): StorageAdapter {
	return s3Storage({
		bucket: credentials.bucket,
		endpoint: credentials.endpoint,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey,
		region: credentials.region,
		publicUrl: credentials.publicUrl
	}).adapter;
}
