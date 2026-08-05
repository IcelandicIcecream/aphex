// The CMS config the test suite runs against.
//
// Same adapters and settings as the app, but with the **test-owned** schema
// registry swapped in. Tests import this instead of `../aphex.config`, so
// editing `src/lib/schemaTypes` while building something can no longer break
// assertions about versioning, singletons, references or caching.

import cmsConfig from '../../aphex.config';
import { schemaTypes } from './schema-types/index.js';

export const testCmsConfig = {
	...cmsConfig,
	schemaTypes
};

export default testCmsConfig;
