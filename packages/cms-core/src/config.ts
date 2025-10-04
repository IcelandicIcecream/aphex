// Aphex CMS Configuration System

import { AuthProvider } from './types';

export interface CMSConfig {
	schemas: Record<string, any>;
	database: {
		adapter: 'postgresql' | 'sqlite' | 'mysql' | 'mongodb';
		connectionString?: string;
		client?: any; // Pre-initialized database client (recommended for database agnosticism)
		options?: any;
	};
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
		// Default configuration
		database: {
			adapter: 'postgresql',
			...config.database
		},
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
