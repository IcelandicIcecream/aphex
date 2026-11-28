import type { AphexClientConfig } from '@aphexcms/cms-core/client';
import { adminAuthClient } from '@aphexcms/auth/client';
import { schemaTypes } from '$lib/schemaTypes';
import { plugins } from '$lib/plugins';

export const aphexClient: AphexClientConfig = {
	schemas: schemaTypes,
	plugins,
	adminAuthClient
};
