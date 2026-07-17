/**
 * Client-safe plugin registry for the admin app.
 *
 * The admin page imports this directly (component parts can't cross SvelteKit
 * `load`); `aphex.config.ts` imports the same array so the server engine ingests
 * schema/route/transform parts. Keep this module free of server-only imports (DB
 * adapters, secrets) so it's safe in the browser bundle.
 *
 * The base template starts with no plugins. To add one:
 *
 * ```ts
 * import { colorPickerPlugin } from '@aphexcms/plugin-color-picker';
 * export const plugins = [colorPickerPlugin()];
 * ```
 */
import type { CMSPlugin } from '@aphexcms/cms-core';

export const plugins: CMSPlugin[] = [];
