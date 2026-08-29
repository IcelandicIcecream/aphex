// Aphex CMS Configuration System
import type { CMSConfig } from './types/index';
import { createPartResolver } from './plugins/resolver';
import { resolveMaxUploadBytes } from './api/limits';

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

	// One upload ceiling, resolved here and pushed into the storage adapter.
	//
	// `upload.maxFileSize` already backed all three request-side checks — the
	// `bodyLimit` middleware, the direct-upload grant, and the limit the admin
	// reads back — but the adapter carried its own independent number, which is
	// how the reference app ended up allowing 100MB requests into an adapter
	// capped at 10MB. Nothing reported the disagreement; uploads in that band
	// simply failed inside `store()`.
	//
	// The request-body value is pushed down as-is rather than the multipart-
	// adjusted one: a Local API or MCP caller has no multipart framing and should
	// be able to store a file of the full configured size.
	config.storage?.setMaxFileSize?.(resolveMaxUploadBytes({ config }));

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
