// Aphex CMS Configuration System
import type { CMSConfig } from './types/index.js';

export function createCMSConfig(config: CMSConfig): CMSConfig {
	return {
		// Start with the user's config and apply defaults for missing properties
		...config,
		storage: config.storage ?? null, // Default to null if not provided
		customization: {
			branding: {
				title: 'Aphex CMS',
				...config.customization?.branding
			},
			...config.customization
		},
		plugins: config.plugins ?? []
	};
}
