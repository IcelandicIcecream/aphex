import { AuthProvider } from "./types";
export interface CMSConfig {
    schemas: Record<string, any>;
    database: {
        adapter: 'postgresql' | 'sqlite' | 'mysql';
        connectionString?: string;
        options?: any;
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
        loginUrl?: string;
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
export declare function createCMSConfig(config: CMSConfig): CMSConfig;
//# sourceMappingURL=config.d.ts.map