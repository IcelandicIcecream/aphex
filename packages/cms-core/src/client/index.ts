// Aphex CMS Core - Client-side exports
// These are safe to import in the browser (no Node.js dependencies)

// Core types (shared between client and server)
export * from '../types.js';

// Field validation (client-side validation)
export * from '../field-validation/rule.js';
export * from '../field-validation/utils.js';

// Content hashing utilities (for client-side change detection)
export { createContentHash, hasUnpublishedChanges } from '../content-hash.js';

// Components (UI components for the admin interface)
export { default as DocumentEditor } from '../components/admin/DocumentEditor.svelte';
export { default as DocumentTypesList } from '../components/admin/DocumentTypesList.svelte';
export { default as SchemaField } from '../components/admin/SchemaField.svelte';
export { default as AdminApp } from '../components/AdminApp.svelte';

// Field components
export { default as StringField } from '../components/admin/fields/StringField.svelte';
export { default as TextareaField } from '../components/admin/fields/TextareaField.svelte';
export { default as NumberField } from '../components/admin/fields/NumberField.svelte';
export { default as BooleanField } from '../components/admin/fields/BooleanField.svelte';
export { default as ImageField } from '../components/admin/fields/ImageField.svelte';
export { default as SlugField } from '../components/admin/fields/SlugField.svelte';
export { default as ArrayField } from '../components/admin/fields/ArrayField.svelte';
export { default as ReferenceField } from '../components/admin/fields/ReferenceField.svelte';

// Utility functions (browser-safe)
export * from '../utils/index.js';
