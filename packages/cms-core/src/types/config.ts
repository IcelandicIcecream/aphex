// types/config.ts
import type { AuthProvider } from '../auth/provider.js';
import type { DatabaseAdapter } from '../db/index.js';
import type { StorageAdapter } from '../storage/interfaces/index.js';
import type { CMSInstances } from '../hooks.js';
import { SchemaType } from './schemas.js';

export interface CMSPlugin {
	name: string;
	version: string;
	routes?: { [path: string]: (event: any) => Promise<Response> | Response };
	install: (cms: any) => Promise<void>;
	config?: { [key: string]: any };
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
