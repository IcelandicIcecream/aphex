// types/config.ts
import type { AuthProvider } from '../auth/provider.js';
import type { DatabaseAdapter } from 'src/db/index.js';
import type { StorageAdapter } from '../storage/interfaces/index.js';

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

export interface CMSConfig {
	schemas: Record<string, any>;
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
