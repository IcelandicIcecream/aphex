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
/**
 * Registry mapping each field `type` keyword to its interface. Built-ins are declared
 * here; a plugin adds its own type by augmenting this interface:
 *
 * ```ts
 * declare module '@aphexcms/cms-core' {
 *   interface FieldTypeMap { color: ColorField }
 * }
 * ```
 *
 * Because both `FieldType` (below) and the `Field` union derive from this map, that one
 * augmentation makes `{ type: 'color' }` a first-class, fully type-safe field —
 * autocomplete, discriminated narrowing, and typo-checking all intact — without opening
 * the union to arbitrary strings. The plugin still ships an `aphex/schema/transform`
 * part that desugars its type into a built-in (usually `object`) at runtime/codegen; the
 * registry is the compile-time half, the transform is the runtime half.
 */
export interface FieldTypeMap {
	string: StringField;
	text: TextField;
	number: NumberField;
	boolean: BooleanField;
	slug: SlugField;
	url: URLField;
	image: ImageField;
	file: FileField;
	array: ArrayField;
	object: ObjectField;
	reference: ReferenceField;
	date: DateField;
	datetime: DateTimeField;
}

export type FieldType = keyof FieldTypeMap;

export interface BaseField {
	name: string;
	type: FieldType;
	title: string;
	description?: string;
	validation?: ((rule: Rule) => Rule) | Array<(rule: Rule) => Rule>;
	group?: string | string[];
	/** Per-field access control — see FieldAccess. */
	access?: FieldAccess;
	/**
	 * Render this field with a custom input widget registered by a plugin
	 * (`aphex/field/component` with a matching `input` key), instead of the built-in
	 * renderer for its `type`. The stored value's shape is still governed by `type`.
	 */
	input?: string;
	/**
	 * Free-form config for a custom `input` widget — read by the plugin component
	 * (e.g. the color picker reads `inputOptions.alpha`). Lives on BaseField so any
	 * field type can carry widget config without widening its own `options`.
	 */
	inputOptions?: Record<string, unknown>;
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
	options: Record<
		string,
		Array<string | { title: string; value: string; icon?: typeof LucideIcon }>
	>;
}

export interface StringField extends BaseField {
	type: 'string';
	maxLength?: number;
	placeholder?: string;
	initialValue?: string | (() => string | Promise<string>);
	list?: Array<string | { title: string; value: string; icon?: typeof LucideIcon }> | DependentList;
	options?: {
		/** `'tabs'` renders a segmented control (great for alignment-style pickers with `icon`s). */
		layout?: 'dropdown' | 'radio' | 'tabs';
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

/**
 * A write-only encrypted secret — for **plugin settings only**, never content.
 *
 * Deliberately a STANDALONE interface, not `extends BaseField` and not in `FieldTypeMap`:
 * that's what keeps `secret` out of the content `FieldType`/`Field` union, so a secret
 * can never enter the content pipeline (documents, versions, the content API, generated
 * types). It's allowed only in an `aphex/settings` declaration (`SettingsField`). Core
 * encrypts it at rest (AES-256-GCM), never serializes the plaintext to the browser
 * (renders a masked placeholder), and decrypts it only when injecting into plugin
 * server code. Submitting a blank value means "leave unchanged"; a new value replaces it.
 */
export interface SecretField {
	name: string;
	type: 'secret';
	title: string;
	description?: string;
	group?: string | string[];
	placeholder?: string;
}

/**
 * A field usable in a plugin settings declaration.
 *
 * Deliberately a NARROW subset of the content field types — settings are config, not
 * content, and this is the exact set `PluginSettingsPanel` renders and
 * `PluginSettingsService` can validate. Widening it would be a lie: an `image` or
 * `reference` here would fall through to a bare text input and store nonsense. If a
 * plugin needs richer configuration, model it as a content document instead.
 *
 * A `string` field carrying `options.list` renders as a select.
 *
 * Note `input` (custom widget) is NOT honoured here — the settings panel renders these
 * types directly and never consults `aphex/field/component`.
 */
export type SettingsField = StringField | TextField | NumberField | BooleanField | SecretField;

export interface NumberField extends BaseField {
	type: 'number';
	min?: number;
	max?: number;
	/** Increment for the slider / number input. Defaults to 1 for sliders. */
	step?: number;
	initialValue?: number | (() => number | Promise<number>);
	options?: {
		/** `'slider'` renders a drag slider instead of a number input. Uses `min`/`max`
		 *  (default 0–100) and `step` (default 1). Defaults to `'input'`. */
		layout?: 'input' | 'slider';
		/** Unit suffix shown in the value label, e.g. `'px'`, `'%'`, `'rem'`. */
		unit?: string;
	};
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
	/** Custom input widget for this item (aphex/field/component), like a field's `input`. */
	input?: string;
	fields?: Field[]; // For inline object definitions (like Sanity)
	icon?: typeof LucideIcon; // Icon shown in the array item row + add menu
	preview?: PreviewConfig; // Title/subtitle/media for the array item row
	to?: Array<{ type: string }>; // For type: 'reference' — allowed target document types
	// Block-specific (only when type === 'block')
	styles?: Array<{ title: string; value: string }>;
	lists?: Array<{ title: string; value: string }>;
	marks?: {
		decorators?: Array<{ title: string; value: string }>;
		annotations?: AnnotationDefinition[];
	};
	of?: Array<{ type: string; title?: string; fields?: Field[] }>; // Inline objects within block
}

export function isBlockArray(field: ArrayField): boolean {
	return field.of.some((ref) => ref.type === 'block');
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

export interface AnnotationDefinition {
	name: string;
	title?: string;
	icon?: any;
	fields: Field[];
}

// Derived from the registry above, so a plugin's `FieldTypeMap` augmentation extends
// this union automatically (and keeps discriminated narrowing on `type`).
export type Field = FieldTypeMap[keyof FieldTypeMap];

export interface PreviewConfig {
	/**
	 * A literal, static title shown as-is (e.g. `'Homepage'`). Distinct from
	 * `select.title`, which is a dot-path read from the document's data. Handy for
	 * singletons whose data has no natural title field — the editor would otherwise
	 * fall back to "Untitled". Precedence: `prepare()` → `title` → `select.title`.
	 */
	title?: string;
	select?: {
		/** Dot-path into the document data (e.g. `seo.title`), NOT a literal. */
		title?: string;
		subtitle?: string;
		media?: string;
	} & Record<string, string>;
	prepare?: (selection: Record<string, unknown>) => {
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
	/**
	 * URL (or resolver) for the live preview iframe in presentation mode.
	 * A string is used as-is (good for singletons like '/about').
	 * A function receives the current draft data and should return a URL
	 * string, or null/undefined when the document isn't previewable yet
	 * (e.g. no slug). The presentation mode button only appears when this
	 * field is defined and the resolved value is non-null.
	 *
	 * Relative paths (e.g. '/blog/my-post?aphex-preview=1') resolve against the
	 * studio's own origin — the common case where the public site is served by
	 * the same app. Return an absolute URL to preview a separate public origin.
	 */
	previewUrl?:
		| string
		| ((doc: Record<string, unknown>, orgId: string | null) => string | null | undefined);
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

/**
 * Arguments passed to every document lifecycle hook.
 *
 * Hooks are decoupled from the Local API on purpose: they receive a minimal
 * `context` (org + user) rather than the full `LocalAPIContext`, so schema
 * definitions never import runtime service types.
 */
export interface DocumentHookArgs<TData = Record<string, unknown>> {
	/** The operation's data — already merged with the stored doc on update. Transform it via the return value. */
	data: TData;
	/** Which write triggered the hook. */
	operation: 'create' | 'update';
	/** The stored document's draft data on update; `null` on create. */
	originalDoc?: TData | null;
	/** Who is performing the write. */
	context: { organizationId: string; userId?: string };
	/** The schema whose hook is running. */
	schema: SchemaType;
}

/**
 * A document lifecycle hook. Receives the operation's data and returns the
 * (possibly transformed) data to carry forward. **Throw to reject the write.**
 *
 * `TData` defaults to `Record<string, unknown>`. Author a schema with
 * {@link defineType} to have `TData` inferred from the schema's own `fields`, so
 * `data` is typed with no codegen and no casts.
 */
export type DocumentHook<TData = Record<string, unknown>> = (
	args: DocumentHookArgs<TData>
) => TData | Promise<TData>;

/**
 * Map a single field's declared `type` to the TS type of its stored value.
 * Primitives are exact; richer fields (image/file/array/object) fall back to
 * `unknown` for now — expand as needed. Kept in sync with the runtime field set.
 */
export type FieldTSType<F extends Field> = F['type'] extends
	| 'string'
	| 'text'
	| 'url'
	| 'slug'
	| 'date'
	| 'datetime'
	? string
	: F['type'] extends 'number'
		? number
		: F['type'] extends 'boolean'
			? boolean
			: F['type'] extends 'reference'
				? { _type: 'reference'; _ref: string }
				: unknown;

/**
 * Derive a document data type from a fields tuple. Fields are optional because a
 * write may carry only a subset (a partial create, a targeted update).
 * Powered by {@link defineType}, which captures the exact `fields` literal.
 */
export type InferFields<F extends readonly Field[]> = {
	[K in F[number] as K['name']]?: FieldTSType<K>;
};

/**
 * Save-time hooks on a schema. Run in order.
 *
 * Scope is deliberately narrow: hooks **transform** data — the one thing field
 * validation can't do (it judges, it never mutates). For *rejection* of bad
 * input, including cross-field invariants, use `validation: (Rule) => Rule.custom(...)`
 * — its context exposes the whole `document`, so "field names unique per form"
 * or "at least one required field" belong there, not here.
 *
 * Side effects (email, webhooks, cache priming) do NOT belong here either —
 * emit a domain event and react in a consumer, so a slow effect never blocks
 * or corrupts the write.
 */
export interface SchemaHooks<TData = Record<string, unknown>> {
	/**
	 * Runs BEFORE field validation. Normalize or derive input here — slugify
	 * keys, trim strings, fill defaults, coerce shapes. Return the transformed
	 * data; validation then runs against the result.
	 */
	beforeValidate?: DocumentHook<TData>[];
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
	/** Save-time normalization + invariant hooks. See {@link SchemaHooks}. */
	hooks?: SchemaHooks;
	/** Document-only: single global instance with id === name. */
	singleton?: boolean;
	/** See DocumentType.previewUrl for full docs. */
	previewUrl?:
		| string
		| ((doc: Record<string, unknown>, orgId: string | null) => string | null | undefined);
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
	/** See DocumentType.previewUrl for full docs. */
	previewUrl?:
		| string
		| ((doc: Record<string, unknown>, orgId: string | null) => string | null | undefined);
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
