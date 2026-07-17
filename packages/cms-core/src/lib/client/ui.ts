// Narrow client entrypoint: admin chrome + context primitives, WITHOUT the
// document editor and field widgets.
//
// The main `@aphexcms/cms-core/client` barrel also re-exports DocumentEditor,
// SchemaField, AdminApp and every *Field component. Those pull the whole field
// registry (+@dnd-kit, +lucide) into one chunk (~597 kB min / 155 kB gzip). A
// page that only wants Sidebar, a confirm dialog or the permissions context is
// downloaded that entire chunk purely because it shares the barrel — Rollup's
// download unit is the chunk, not the tree-shaken symbol.
//
// Everything re-exported here is verified free of field-component imports, so
// the admin layout and non-editor admin pages (settings, members, roles…) can
// import from `/client/ui` and stay off the editor chunk. The editor route that
// mounts AdminApp/DocumentEditor keeps importing from the full `/client`.

// Core + sidebar types
export * from '../types/index';
export type { SidebarUser, SidebarNavItem, SidebarBranding, SidebarData } from '../types/sidebar';

// Field validation (client-side Rule + helpers) — plain JS
export * from '../field-validation/rule';
export * from '../field-validation/utils';

// Content hashing (change detection)
export { createContentHash, hasUnpublishedChanges } from '../utils/content-hash';

// Schema context
export { setSchemaContext, getSchemaContext } from '../schema-context.svelte';

// Admin extension slots (plugin seam)
export {
	AdminSlots,
	setAdminSlots,
	useAdminSlots,
	type AdminSlotName,
	type AdminSlotEntry
} from '../admin/slots.svelte';
export type { AdminArea } from '../admin/types';

// Field-input widget registry (plugins register components for a field's `input`)
export {
	setFieldComponents,
	useFieldComponents,
	type FieldComponentLookup
} from '../admin/field-components.svelte';

// Admin URL navigation
export {
	createAdminNav,
	setAdminNav,
	useAdminNav,
	type AdminNav,
	type AdminParam,
	type ParamPatch
} from '../admin/nav.svelte';

// Permissions context (capability-based UI gating)
export {
	setPermissionsContext,
	usePermissions,
	type PermissionsContext
} from '../permissions-context.svelte';

// Schema utilities
export * from '../schema-utils/index';

// Inline editor previews for custom rich-text block types (registration only —
// the previews themselves are app-owned and lazy).
export {
	setBlockPreviews,
	useBlockPreviews,
	type BlockPreviewProps,
	type BlockPreviewLookup
} from '../admin/block-previews.svelte';

// Admin chrome
export { default as Sidebar } from '../components/layout/Sidebar.svelte';
export { default as PermissionsDebug } from '../components/admin/PermissionsDebug.svelte';
// Plugin settings panel — renders its own inputs, does not pull the field registry.
export { default as PluginSettingsPanel } from '../components/admin/PluginSettingsPanel.svelte';

// Browser-safe utilities + API client
export * from '../utils/index';
export * from '../api/index';
export type { ApiResponse } from '../api/index';

// Toast notifications
export { toast } from 'svelte-sonner';

// Confirm dialog (imperative API + host)
export {
	confirmDialog,
	type ConfirmDialogOptions
} from '../components/admin/confirm-dialog/confirm-dialog.svelte';
export { default as ConfirmDialogHost } from '../components/admin/confirm-dialog/ConfirmDialogHost.svelte';

// Live-preview stega helper (small)
export { stegaClean } from '../preview/stega.js';
