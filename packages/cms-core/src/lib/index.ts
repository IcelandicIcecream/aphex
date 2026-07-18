// Aphex CMS Core - Main exports
//
// This barrel is the "universal" entry point: every export here is safe to
// resolve from Node ESM as well as Vite/SvelteKit — i.e. no `.svelte`
// component files. That matters because ES-module `export *` eagerly links
// every re-export, and if any server-side import path hits a raw `.svelte`
// re-export, Node's native loader throws `ERR_UNKNOWN_FILE_EXTENSION` for
// anything it happens to resolve through native ESM (SSR edge cases,
// loader-hook workers, etc).
//
// If you need the Svelte admin components (`DocumentEditor`, `AdminApp`,
// `Sidebar`, field components, `ConfirmDialogHost`, `PermissionsDebug`…)
// import them from `@aphexcms/cms-core/client` instead.
//
// For server-only functionality (adapters, hooks, engine, routes), import
// from `@aphexcms/cms-core/server`.

// Core types (shared between client and server)
export * from './types/index';
export type { SidebarUser, SidebarNavItem, SidebarBranding, SidebarData } from './types/sidebar';

// Field validation
export * from './field-validation/rule';
export * from './field-validation/utils';

// Content hashing utilities
export { createContentHash, hasUnpublishedChanges } from './utils/content-hash';

// Schema utilities
export * from './schema-utils/index';

// Event catalog — defineEvent() + built-in event definitions (document.published, …).
// Plain TS (zod only), safe for the universal barrel.
export * from './events/index';

// Theme design-system tokens — plain TS (Svelte-free), safe for the universal barrel.
export * from './theme/index';

// Plugin API — definePlugin(), part types, part resolver. Runtime is plain JS
// (svelte/hono imports are type-only), so it's safe on both server and client.
export * from './plugins/index';

// General utility functions (logger, image URL builder, etc)
export * from './utils/index';

// Unified API client
export * from './api/index';
export type { ApiResponse } from './api/index';

// NOTE: The following are intentionally NOT re-exported from this root
// barrel. They're all Svelte runtime constructs — rune modules that use
// `$state` or real `.svelte` components — and re-exporting them here would
// transitively pull Svelte-only code through every import of
// `@aphexcms/cms-core`, breaking Node-side usage (SSR module evaluation,
// loader hooks, etc). Import from their dedicated subpaths instead:
//
//   import { setSchemaContext, getSchemaContext } from '@aphexcms/cms-core/client';
//   import { setPermissionsContext, usePermissions } from '@aphexcms/cms-core/client';
//   import { confirmDialog } from '@aphexcms/cms-core/client';
//   import { toast } from 'svelte-sonner';
//
// Only use the root barrel (`@aphexcms/cms-core`) for server-safe utilities,
// types, and pure JS helpers.
