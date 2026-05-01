// types/schemas.ts
import type { Rule } from '../field-validation/rule';
import type { Icon as LucideIcon } from '@lucide/svelte';
import type { OrganizationRole } from './organization';

/**
 * Declarative per-schema access control.
 *
 * Each operation lists the organization roles allowed to perform it. When an
 * operation is omitted, the default capability map applies. Instance roles
 * (`super_admin`, `admin`) always bypass these lists — see
 * `effectiveOrganizationRole` in types/capabilities.
 */
/**
 * Context passed to access policy functions.
 *
 * `auth` is whatever the request carries (session or API key). `doc` is the
 * stored document for operations that target one (read/update/delete/publish/
 * unpublish) and `undefined` for `create` — the doc doesn't exist yet.
 */
export interface AccessPolicyContext {
	auth: import('./auth').Auth;
	doc?: import('./document').Document;
}

/**
 * A rule can be either a static role allowlist or a function evaluated per
 * request. Role lists accept built-in role names (`OrganizationRole`) plus
 * any custom role name defined on the organization. Policy functions unlock
 * ownership-style rules that role lists can't express, e.g.
 * `doc.createdBy === auth.user.id`.
 */
export type AccessRule =
	| Array<OrganizationRole | (string & {})>
	| ((ctx: AccessPolicyContext) => boolean);

export interface SchemaAccess {
	read?: AccessRule;
	create?: AccessRule;
	update?: AccessRule;
	delete?: AccessRule;
	publish?: AccessRule;
	unpublish?: AccessRule;
}

/**
 * Per-field access control. Applied after SchemaAccess passes.
 *
 * - `read` — roles listed see the field in responses and UI; others get it
 *   stripped from the payload. When omitted, the field is readable by anyone
 *   who can read the document.
 * - `update` — roles listed can write the field; others have their writes
 *   silently dropped at the API boundary and the UI renders read-only.
 *
 * Built-in instance roles (super_admin, admin) always bypass field rules —
 * same precedence as document-level access.
 */
export interface FieldAccess {
	read?: Array<OrganizationRole | (string & {})>;
	update?: Array<OrganizationRole | (string & {})>;
}

// From root types.ts
export type FieldType =
	| 'string'
	| 'text'
	| 'number'
	| 'boolean'
	| 'slug'
	| 'url'
	| 'image'
	| 'file'
	| 'array'
	| 'object'
	| 'reference'
	| 'date'
	| 'datetime';

export interface BaseField {
	name: string;
	type: FieldType;
	title: string;
	description?: string;
	validation?: ((rule: Rule) => Rule) | Array<(rule: Rule) => Rule>;
	group?: string | string[];
	/** Per-field access control — see FieldAccess. */
	access?: FieldAccess;
}

export interface FieldGroup {
	name: string;
	title: string;
	icon?: typeof LucideIcon;
	default?: boolean;
	hidden?: boolean;
}

export interface DependentList {
	dependsOn: string;
	options: Record<string, Array<string | { title: string; value: string }>>;
}

export interface StringField extends BaseField {
	type: 'string';
	maxLength?: number;
	placeholder?: string;
	initialValue?: string | (() => string | Promise<string>);
	list?: Array<string | { title: string; value: string }> | DependentList;
	options?: {
		layout?: 'dropdown' | 'radio';
		direction?: 'horizontal' | 'vertical';
	};
}

export interface TextField extends BaseField {
	type: 'text';
	rows?: number;
	maxLength?: number;
	placeholder?: string;
	initialValue?: string | (() => string | Promise<string>);
}

export interface NumberField extends BaseField {
	type: 'number';
	min?: number;
	max?: number;
	initialValue?: number | (() => number | Promise<number>);
}

export interface BooleanField extends BaseField {
	type: 'boolean';
	initialValue?: boolean | (() => boolean | Promise<boolean>);
}

export interface SlugField extends BaseField {
	type: 'slug';
	source?: string;
	maxLength?: number;
	initialValue?: string | (() => string | Promise<string>);
}

export interface URLField extends BaseField {
	type: 'url';
	placeholder?: string;
	initialValue?: string | (() => string | Promise<string>);
}

export interface ImageField extends BaseField {
	type: 'image';
	accept?: string;
	hotspot?: boolean; // Enable hotspot/crop UI
	metadata?: string[]; // e.g., ['palette', 'exif', 'location']
	fields?: Field[]; // Additional fields like caption, attribution
	private?: boolean; // Default: false (public). Set true to require auth for access
	initialValue?: string | (() => string | Promise<string>);
}

export interface FileField extends BaseField {
	type: 'file';
	accept?: string[]; // Allowed MIME types: ['application/pdf', 'image/*', '.docx']
	maxSize?: number; // Max file size in bytes
	private?: boolean; // Default: false (public). Set true to require auth for access
	fields?: Field[]; // Additional metadata fields
	initialValue?: string | (() => string | Promise<string>);
}

export interface TypeReference {
	type: string; // References a SchemaType by name or inline type definition
	title?: string;
	name?: string; // For inline objects
	fields?: Field[]; // For inline object definitions (like Sanity)
	icon?: typeof LucideIcon; // Icon shown in the array item row + add menu
	preview?: PreviewConfig; // Title/subtitle/media for the array item row
}

export interface ArrayField extends BaseField {
	type: 'array';
	of: TypeReference[];
	initialValue?: any[] | (() => any[] | Promise<any[]>);
	options?: {
		layout?: 'grid' | 'list';
	};
}

export interface ObjectField extends BaseField {
	type: 'object';
	fields: Field[];
	initialValue?: Record<string, any> | (() => Record<string, any> | Promise<Record<string, any>>);
}

export interface DateField extends BaseField {
	type: 'date';
	options?: {
		dateFormat?: string; // Default: 'YYYY-MM-DD' (Moment.js format)
		calendarTodayLabel?: string; // Label for "today" button
	};
	initialValue?: string | (() => string | Promise<string>);
}

export interface DateTimeField extends BaseField {
	type: 'datetime';
	options?: {
		dateFormat?: string; // Display format for date portion (Default: 'YYYY-MM-DD')
		timeFormat?: string; // Display format for time portion (Default: 'HH:mm')
		timeStep?: number; // Minutes between time picker options (Default: 15)
		allowTimeZoneSwitch?: boolean; // Allow user timezone switching (Default: true)
		displayTimeZone?: string; // Specific timezone for display (stored as UTC)
	};
	initialValue?: string | (() => string | Promise<string>);
}

export interface ReferenceField extends BaseField {
	type: 'reference';
	to: Array<{ type: string }>;
	initialValue?: any | (() => any | Promise<any>);
}

export type Field =
	| StringField
	| TextField
	| NumberField
	| BooleanField
	| SlugField
	| URLField
	| ImageField
	| FileField
	| ArrayField
	| ObjectField
	| DateField
	| DateTimeField
	| ReferenceField;

export interface PreviewConfig {
	select?: {
		title?: string;
		subtitle?: string;
		media?: string;
	};
}

export interface OrderingItem {
	field: string;
	direction: 'asc' | 'desc';
}

export interface Ordering {
	title: string;
	name: string;
	by: OrderingItem[];
}

export interface DocumentType {
	id?: string;
	type: 'document';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	group?: string;
	groups?: FieldGroup[];
	fields: Field[];
	preview?: PreviewConfig;
	orderings?: Ordering[];
	access?: SchemaAccess;
	/**
	 * When true, the schema represents a single global document (e.g. site
	 * navigation, footer). Only one row exists, its id equals the schema name,
	 * and the admin UI hides Create/Delete affordances. Ignored on object types.
	 */
	singleton?: boolean;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export interface ObjectType {
	type: 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
}

// From db/types.ts
/**
 * Schema type - represents document and object type definitions stored in the DB
 */
// Schema type for all definitions
export interface SchemaType {
	id?: string;
	type: 'document' | 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	group?: string;
	groups?: FieldGroup[];
	fields: Field[];
	preview?: PreviewConfig;
	orderings?: Ordering[];
	access?: SchemaAccess;
	/** Document-only: single global instance with id === name. */
	singleton?: boolean;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export interface NewSchemaType {
	id?: string;
	type: 'document' | 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	group?: string;
	groups?: FieldGroup[];
	fields: Field[];
	preview?: PreviewConfig;
	orderings?: Ordering[];
	access?: SchemaAccess;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
