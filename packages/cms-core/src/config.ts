// Aphex CMS Configuration System

import { AuthProvider } from './types';
import type { DatabaseProvider } from './db/interfaces/index.js';

export interface CMSConfig {
	schemas: Record<string, any>;
	database: DatabaseProvider;
	storage?: {
		adapter?: any; // StorageAdapter instance (from helper functions like r2Storage()) or undefined for local
		basePath?: string; // Used for local storage
		baseUrl?: string; // Used for local storage
		disableLocalStorage?: boolean; // Set by helper functions automatically
		options?: any;
	};
	customization?: {
		branding?: {
			title?: string;
			logo?: string;
			favicon?: string;
		};
		theme?: {
			colors?: Record<string, string>;
			fonts?: Record<string, string>;
		};
	};
	plugins?: CMSPlugin[];
	auth?: {
		provider: AuthProvider;
		loginUrl?: string; // Redirect here when unauthenticated (default: '/login')
	};
}

export interface CMSPlugin {
	name: string;
	version: string;
	install: (cms: any) => void;
	fieldTypes?: Record<string, any>;
	adapters?: {
		storage?: any;
		database?: any;
	};
}

export function createCMSConfig(config: CMSConfig): CMSConfig {
	return {
		// Database provider passed directly (no defaults needed)
		database: config.database,
		// Storage defaults
		storage: {
			adapter: 'local',
			basePath: './static/uploads',
			baseUrl: '/uploads',
			...config.storage
		},
		customization: {
			branding: {
				title: 'Aphex CMS',
				...config.customization?.branding
			},
			...config.customization
		},
		plugins: [],
		// User overrides
		...config
	};
}
