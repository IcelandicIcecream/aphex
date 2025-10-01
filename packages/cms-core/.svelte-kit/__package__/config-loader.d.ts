import type { CMSConfig } from './types.js';
/**
 * Dynamically loads CMS config with hot-reload support
 * This bypasses the static import to enable schema changes
 */
export declare function loadCMSConfig(): Promise<CMSConfig>;
/**
 * Forces a config reload - useful for schema hot-reloading
 */
export declare function reloadConfig(): Promise<CMSConfig>;
/**
 * Invalidates the cached config - next call will reload
 */
export declare function invalidateConfig(): void;
//# sourceMappingURL=config-loader.d.ts.map