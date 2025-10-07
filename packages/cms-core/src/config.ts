// Aphex CMS Configuration System
import type { CMSConfig } from './types/index.js';

export function createCMSConfig(config: CMSConfig): CMSConfig {
	const { database, storage, customization, plugins, ...rest } = config;
	return {
		...rest,
		database: database,
		// Storage defaults
		storage: {
			adapter: 'local',
			basePath: './static/uploads',
			baseUrl: '/uploads',
			...storage
		},
		customization: {
			branding: {
				title: 'Aphex CMS',
				...customization?.branding
			},
			...customization
		},
		plugins: plugins ?? []
	};
}
