// apps/studio/src/lib/server/graphql/index.ts
// Lazy GraphQL plugin loader - prevents bundling GraphQL into config file

import type { CMSPlugin } from '@aphexcms/cms-core/server';

export interface GraphQLPluginOptions {
	endpoint?: string;
	enableGraphiQL?: boolean;
	defaultPerspective?: 'draft' | 'published';
}

/**
 * Creates a lazy-loading GraphQL plugin that doesn't import graphql-yoga
 * until runtime (install method). This keeps the bundle size small.
 */
export function createLazyGraphQLPlugin(options: GraphQLPluginOptions = {}): CMSPlugin {
	return {
		name: '@aphexcms/graphql-plugin',
		version: '0.1.0',
		config: options,
		async install(cms: any) {
			// Only import GraphQL libraries when plugin is actually installed at runtime
			const { createGraphQLPlugin } = await import('@aphexcms/graphql-plugin');
			const actualPlugin = createGraphQLPlugin(options);

			// Install the actual plugin
			if (actualPlugin.install) {
				await actualPlugin.install(cms);
			}
		}
	};
}

// Export a default configured instance
export const graphqlPlugin = createLazyGraphQLPlugin({
	endpoint: '/api/graphql',
	enableGraphiQL: true,
	defaultPerspective: 'draft'
});
