// types/config.ts
import type { DatabaseProvider } from '../db/interfaces/index.js';

import type { AuthProvider } from '../auth/provider.js';
import type { DatabaseProvider } from '../db/interfaces/index.js';

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
	database: DatabaseProvider;
	storage?: {
		adapter?: any;
		basePath?: string;
		baseUrl?: string;
		disableLocalStorage?: boolean;
		opts?: any;
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
		loginUrl?: string;
	};
}
