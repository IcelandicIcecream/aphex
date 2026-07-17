// Aphex CMS Configuration System
import type { CMSConfig } from './types/index';
import { createPartResolver } from './plugins/resolver';

export function createCMSConfig(config: CMSConfig): CMSConfig {
	// Resolve plugin parts once (also runs duplicate-part-id validation) and fold
	// schema contributions into `schemaTypes` so the engine, GraphQL, and typegen
	// treat plugin schemas identically to app schemas. Non-schema parts are indexed
	// by a resolver rebuilt at hook-init and exposed on locals.aphexCMS.partResolver.
	const resolver = createPartResolver(config.plugins ?? []);
	const pluginSchemas = resolver.schemaTypes();
	// Merge plugin schemas, then let schema-transform parts decorate the full list
	// (e.g. inject an SEO field group into chosen collections).
	const mergedSchemas = resolver.applySchemaTransforms([...config.schemaTypes, ...pluginSchemas]);

	return {
		// Start with the user's config and apply defaults for missing properties
		...config,
		schemaTypes: mergedSchemas,
		storage: config.storage ?? null, // Default to null if not provided
		customization: {
			branding: {
				title: 'Aphex CMS',
				...config.customization?.branding
			},
			...config.customization
		}
	};
}
