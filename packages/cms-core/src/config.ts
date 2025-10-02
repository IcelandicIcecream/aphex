// Aphex CMS Configuration System

import { AuthProvider } from "./types";

export interface CMSConfig {
  schemas: Record<string, any>;
  database: {
    adapter: 'postgresql' | 'sqlite' | 'mysql';
    connectionString?: string;
    config?: any;
  };
  storage: {
    adapter: 'local' | 's3' | 'gcs' | 'cloudinary';
    basePath?: string;
    baseUrl?: string;
    config?: any;
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
