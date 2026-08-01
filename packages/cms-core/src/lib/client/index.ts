// Aphex CMS Core - Client-side exports
// These are safe to import in the browser (no Node.js dependencies)

// Core types (shared between client and server)
export * from '../types/index';
export type { SidebarUser, SidebarNavItem, SidebarBranding, SidebarData } from '../types/sidebar';

// Field validation (client-side validation)
export * from '../field-validation/rule';
export * from '../field-validation/utils';

// Content hashing utilities (for client-side change detection)
export { createContentHash, hasUnpublishedChanges } from '../utils/content-hash';

// Schema context (for providing schemas to components)
export { setSchemaContext, getSchemaContext } from '../schema-context.svelte';

// Admin extension slots — runtime UI registration primitive (plugin seam).
export {
	AdminSlots,
	setAdminSlots,
	useAdminSlots,
	type AdminSlotName,
	type AdminSlotEntry
} from '../admin/slots.svelte';
export type { AdminArea } from '../admin/types';
// Field-input widgets — plugins register components for a field's `input` key.
export {
	setFieldComponents,
	useFieldComponents,
	type FieldComponentLookup
} from '../admin/field-components.svelte';
// Admin URL navigation — typed intents, shareable via context (plugin tools can navigate).
export {
	createAdminNav,
	setAdminNav,
	useAdminNav,
	type AdminNav,
	type AdminParam,
	type ParamPatch
} from '../admin/nav.svelte';

// Permissions context (for capability-based UI gating)
export {
	setPermissionsContext,
	usePermissions,
	type PermissionsContext
} from '../permissions-context.svelte';

// Schema utilities (for working with schemas)
export * from '../schema-utils/index';

// Components (UI components for the admin interface)
export { default as DocumentEditor } from '../components/admin/DocumentEditor.svelte';
export { default as AgentChat } from '../components/admin/AgentChat.svelte';
export { default as SchemaField } from '../components/admin/SchemaField.svelte';
export { default as PluginSettingsPanel } from '../components/admin/PluginSettingsPanel.svelte';

// Inline editor previews for custom rich-text block types (app-owned presentation).
export {
	setBlockPreviews,
	useBlockPreviews,
	type BlockPreviewProps,
	type BlockPreviewLookup
} from '../admin/block-previews.svelte';
export { default as AdminApp } from '../components/AdminApp.svelte';
export { default as Sidebar } from '../components/layout/Sidebar.svelte';

// Debug helpers
export { default as PermissionsDebug } from '../components/admin/PermissionsDebug.svelte';

// Field components
export { default as StringField } from '../components/admin/fields/StringField.svelte';
export { default as TextareaField } from '../components/admin/fields/TextareaField.svelte';
export { default as NumberField } from '../components/admin/fields/NumberField.svelte';
export { default as BooleanField } from '../components/admin/fields/BooleanField.svelte';
export { default as ImageField } from '../components/admin/fields/ImageField.svelte';
export { default as FileField } from '../components/admin/fields/FileField.svelte';
export { default as SlugField } from '../components/admin/fields/SlugField.svelte';
export { default as ArrayField } from '../components/admin/fields/ArrayField.svelte';
export { default as ReferenceField } from '../components/admin/fields/ReferenceField.svelte';

// Utility functions (browser-safe)
export * from '../utils/index';

export * from '../api/index';
export type { ApiResponse } from '../api/index';

// Toast notifications (re-exported from svelte-sonner for convenience)
export { toast } from 'svelte-sonner';

// Confirm dialog (imperative API backed by a mounted host)
export {
	confirmDialog,
	type ConfirmDialogOptions
} from '../components/admin/confirm-dialog/confirm-dialog.svelte';
export { default as ConfirmDialogHost } from '../components/admin/confirm-dialog/ConfirmDialogHost.svelte';

// Live preview — the runtime overlay + document context live in @aphexcms/visual-editing
// (AphexVisualOverlay, getLivePreviewDocument). cms-core only owns the stega encoder used
// by the editor and the stegaClean helper re-exported here for convenience.
export { stegaClean } from '../preview/stega.js';
