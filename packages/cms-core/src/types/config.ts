// types/config.ts
import type { AuthProvider } from '../auth/provider.js';
import type { DatabaseAdapter } from 'src/db/index.js';
import type { StorageAdapter } from '../storage/interfaces/index.js';
import type { CMSInstances } from '../hooks.js';
import { SchemaType } from './schemas.js';

export interface CMSPlugin {
	name: string;
	version?: string;
	install: (cms: CMSInstances) => void | Promise<void>;
	// Optional routes that this plugin handles
	routes?: Record<string, (event: any) => Promise<Response> | Response>;
	// Plugins can expose any additional properties/methods
	[key: string]: any;
}

export interface CMSConfig {
	schemaTypes: SchemaType[];
	database: DatabaseAdapter;
	storage?: StorageAdapter | null;
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
		loginUrl?: string;
	};
}
