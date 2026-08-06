// The CMS config the test suite runs against.
//
// Same adapters and settings as the app, but with the **test-owned** schema
// registry swapped in. Tests import this instead of `../aphex.config`, so
// editing `src/lib/schemaTypes` while building something can no longer break
// assertions about versioning, singletons, references or caching.

import { createStorageAdapter } from '@aphexcms/cms-core/server';
import cmsConfig from '../../aphex.config';
import { schemaTypes } from './schema-types/index.js';

export const testCmsConfig = {
	...cmsConfig,
	schemaTypes,
	// Local disk, never the app's storage adapter. `src/lib/server/storage`
	// picks S3/R2 as soon as R2_* is present in .env, so on a developer machine
	// with real credentials the upload tests did a live network PUT — failing
	// offline, and writing to a real bucket when it worked. Whether uploads
	// round-trip through S3 is the storage adapter's test, not the CMS's.
	storage: createStorageAdapter('local', {
		basePath: './storage/test-assets',
		baseUrl: ''
	})
};

export default testCmsConfig;
