// types/schemas.ts
import type { DocumentHookReader } from '../local-api/hook-reader';
import type { Rule } from '../field-validation/rule';
import type { Icon as LucideIcon } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { OrganizationRole } from './organization';
import type { FileValue, ImageValue } from './asset';

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
	/**
	 * Hide this field when the predicate returns true — for settings that only
	 * apply to one branch of a choice (a link's target document when the link is
	 * internal, a hero's alignment when the hero is text).
	 *
	 * Receives `{ siblingData, documentData }`. Reach for `siblingData`: it is the
	 * object the field belongs to, so repeated array items each resolve against
	 * their own values instead of all following the first row.
	 *
	 * A hidden field is skipped by validation too, so a required field on the
	 * inactive branch can't block a save with an error nobody can see. Its stored
	 * value is kept, so toggling a choice twice isn't destructive.
	 *
	 * **Not access control.** The value is still in the document, in API responses
	 * and writable through the API. Use `access` for that.
	 */
	hidden?: FieldCondition;
	/**
	 * Retire this field without losing what it holds. The admin, the API and the
	 * site treat it as before; an AI agent (MCP) isn't shown it, and a new value it
	 * writes here is refused with `reason`, so say what to use instead: `'Use
	 * "symbol".'` Pair it with `hidden` to stop offering it to people too.
	 */
	deprecated?: { reason: string };
	/**
	 * Capabilities the organization needs for the admin to show this field, such as
	 * a site-wide "Project pages" setting that means nothing without `site.projects`.
	 * The same rule as a type's (`hasRequiredCapabilities`).
	 *
	 * Display only, like `hidden`: a stored value is kept and still reaches the API.
	 * Gate a whole type with its own `requiredCapabilities` where access matters.
	 */
	requiredCapabilities?: string[];
	/**
	 * What this field is while it's empty, when that isn't nothing: a value it takes
	 * from elsewhere (a theme's style, a site-wide default) until it's set here. The
	 * admin shows that value in the empty control, marks the field once it's set by
	 * hand, and offers to put it back; an object holding such fields offers to put
	 * them all back. For leaf fields only.
	 *
	 * Display only: the stored value stays empty, and whatever reads the document
	 * decides what empty means. Have `value` call the same function the renderer
	 * does, or the form and the page disagree.
	 *
	 * ```ts
	 * inherits: { from: 'the style', value: ({ documentData }) => styleOf(documentData).corners }
	 * ```
	 */
	inherits?: {
		/** Where the value comes from, said after "From": `'the style'`. */
		from: string;
		value: (context: FieldVisibilityContext) => unknown;
	};
	/**
	 * Whether the visual-editing preview may mark this value with the invisible
	 * characters that make text click-to-edit. Set `false` for text that is never
	 * read as text — a colour, a URL, CSS, an anchor id, a font name — and on an
	 * object or array to leave everything inside it unmarked. A marked value no
	 * longer equals itself (`'#e11d48'` stops being a colour), and the breakage
	 * shows in preview only. A string with a `list` is never marked: it holds one
	 * of a fixed set of values, which a renderer compares rather than shows.
	 */
	stega?: boolean;
	/**
	 * The name of a fieldset (declared in `fieldsets` on the same type or object) to
	 * show this field in. Layout only: the value is stored where it always was.
	 */
	fieldset?: string;
}

/**
 * A titled section of fields in the editor, optionally folded away. Purely how the
 * form is laid out: a field in a fieldset is stored exactly as it would be without
 * one, so fieldsets can be added, renamed or removed without touching any data.
 * Use them to keep a long form short, with what most people change in the open
 * and the rest a click away.
 */
export interface Fieldset {
	name: string;
	title: string;
	description?: string;
	options?: {
		/** Show a toggle that folds the section away. */
		collapsible?: boolean;
		/** Start folded. Implies `collapsible`. */
		collapsed?: boolean;
		/** Lay the fields out side by side, this many to a row (1 to 4). One column on a phone. */
		columns?: number;
	};
}

/**
 * The two scopes a `hidden` predicate resolves against.
 *
 * `siblingData` is the object the field belongs to — the array item, the inline
 * object, or the document itself at the top level; `documentData` is always the
 * whole document. Reach for sibling: inside a repeated array item, resolving
 * against the document would make every row follow the first one's value.
 */
export interface FieldVisibilityContext {
	siblingData: Record<string, unknown>;
	documentData: Record<string, unknown>;
}

/** Returns true to hide the field. See `BaseField.hidden`. */
export type FieldCondition = (context: FieldVisibilityContext) => boolean;

export interface FieldGroup {
	name: string;
	title: string;
	icon?: typeof LucideIcon;
	default?: boolean;
	hidden?: boolean;
}

/**
 * A list option's picture: a Lucide icon, or any component that takes a `class`
 * (a drawing of a layout for the `'cards'` layout).
 */
export type ListOptionIcon = Component<{ class?: string }>;

/** One option of a string field's `list`, in its title/value form. */
export interface ListOption {
	title: string;
	value: string;
	icon?: ListOptionIcon;
	/**
	 * Capabilities the organization needs for this choice to be offered (a link to
	 * a booking page, on a site with bookings). The admin leaves it out otherwise;
	 * a value already stored still shows. Not enforced on save: pair it with
	 * `validation` where the value must be refused.
	 */
	requiredCapabilities?: string[];
}

export interface DependentList {
	dependsOn: string;
	options: Record<string, Array<string | ListOption>>;
}

export interface StringField extends BaseField {
	type: 'string';
	maxLength?: number;
	placeholder?: string;
	initialValue?: string | (() => string | Promise<string>);
	list?: Array<string | ListOption> | DependentList;
	options?: {
		/**
		 * `'tabs'` renders a segmented control (great for alignment-style pickers with
		 * `icon`s). `'cards'` renders a grid of cards, each option's `icon` drawn large
		 * as a picture of the choice over its title: for choices recognised by looking,
		 * like a block's layouts. The icon is any component; it fills a 4:3 box and
		 * should draw in `currentColor`, so it follows the theme and the selection.
		 */
		layout?: 'dropdown' | 'radio' | 'tabs' | 'cards';
		direction?: 'horizontal' | 'vertical';
		/**
		 * Tabs whose options have an `icon` show only the icon, with the title on
		 * hover. `true` shows the title beside it, for choices an icon can't name alone.
		 */
		showTitles?: boolean;
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
	/** Hint inside the empty input. Defaults to the field's title. */
	placeholder?: string;
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
	accept?: string | string[];
	hotspot?: boolean; // Enable hotspot/crop UI
	metadata?: string[]; // e.g., ['palette', 'exif', 'location']
	fields?: Field[]; // Additional fields like caption, attribution
	private?: boolean; // Default: false (public). Set true to require auth for access
	initialValue?: string | (() => string | Promise<string>);
}

export interface FileField extends BaseField {
	type: 'file';
	accept?: string | string[]; // Allowed MIME types/extensions, as input syntax or an array
	maxSize?: number; // Max file size in bytes
	private?: boolean; // Default: false (public). Set true to require auth for access
	fields?: Field[]; // Additional metadata fields
	initialValue?: string | (() => string | Promise<string>);
}

/**
 * A starting value for a whole object type, like Sanity's: an object, or a
 * function (sync or async) that returns one. Used when the object is added to
 * an array, so a page builder's block can start filled in.
 */
export type ObjectInitialValue =
	| Record<string, unknown>
	| (() => Record<string, unknown> | Promise<Record<string, unknown>>);

export interface TypeReference {
	type: string; // References a SchemaType by name or inline type definition
	/** A starting value for the whole object when it is added to an array: an object, or a function returning one. Like Sanity's. */
	initialValue?: ObjectInitialValue;
	title?: string;
	name?: string; // For inline objects
	/** One line on what this item is for, shown in the insert menu (`options.insertMenu`). */
	description?: string;
	/** Custom input widget for this item (aphex/field/component), like a field's `input`. */
	input?: string;
	fields?: Field[]; // For inline object definitions (like Sanity)
	/** Sections to lay an inline object's fields out in. See `Fieldset`. */
	fieldsets?: Fieldset[];
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
	return (field.of ?? []).some((ref) => ref.type === 'block');
}

/**
 * A grouped, searchable "add item" dialog for an array with many item types (a
 * page builder's blocks), in place of the plain dropdown. Shaped like Sanity's
 * `insertMenu`, so a schema written for one reads naturally in the other.
 */
export interface ArrayInsertMenu {
	/**
	 * Tabs that sort the types. `of` names item types (the `name` of an inline
	 * type, else its `type`). Types no group names still appear under "All".
	 */
	groups?: Array<{ name: string; title?: string; of?: string[] }>;
	/** Show a search box: `'auto'` (the default) once there are more than 5 types. */
	filter?: boolean | 'auto';
	/**
	 * How types are laid out; the first is shown, and a second adds a toggle. In
	 * the grid, `previewImageUrl` gives each type a thumbnail (a URL, or a data
	 * URI); a type without one falls back to its icon.
	 */
	views?: Array<
		{ name: 'list' } | { name: 'grid'; previewImageUrl?: (typeName: string) => string | undefined }
	>;
}

export interface ArrayField extends BaseField {
	type: 'array';
	of: TypeReference[];
	initialValue?: any[] | (() => any[] | Promise<any[]>);
	/** For `layout: 'tags'`: the hint in the empty box. */
	placeholder?: string;
	options?: {
		/**
		 * `'tags'`, for an array of strings: chips in one box, added with Enter or a
		 * comma. For short items: words, tags, keywords. `'grid'`, for images.
		 */
		layout?: 'grid' | 'list' | 'tags';
		/** Replace the "Add item" dropdown with a grouped, searchable dialog. */
		insertMenu?: ArrayInsertMenu;
	};
}

export interface ObjectField extends BaseField {
	type: 'object';
	fields: Field[];
	/** Sections to lay this object's fields out in. See `Fieldset`. */
	fieldsets?: Fieldset[];
	options?: {
		/** Show a toggle that folds the whole object away. */
		collapsible?: boolean;
		/** Start folded. Implies `collapsible`. */
		collapsed?: boolean;
	};
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

export interface SearchFieldConfig {
	/** Dot-path into the document data (e.g. `'title'`, `'seo.title'`). */
	path: string;
	// weight?: number; — reserved for future ranked search, not implemented yet
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

/** The words the document editor uses for publishing. See {@link PublishingOptions}. */
export interface PublishLabels {
	/** The tab showing work in progress. Default "Draft". */
	draft: string;
	/** The tab and status for the live version. Default "Published". */
	published: string;
	/** The button for a document never published, or taken down. Default "Publish". */
	publish: string;
	/** The button when the draft differs from the live version. Default "Publish changes". */
	publishChanges: string;
	/** The (disabled) button when the live version is current. Default "Published". */
	upToDate: string;
	/** While publishing. Default "Publishing...". */
	publishing: string;
	/** The brief confirmation after publishing. Default "Published!". */
	justPublished: string;
	/** Takes the live version down. Default "Unpublish". */
	unpublish: string;
	/** The status for a document taken down. Default "Unpublished". */
	unpublished: string;
}

export interface PublishingOptions {
	/** Rename any of the publishing words; the rest keep their defaults. */
	labels?: Partial<PublishLabels>;
	/**
	 * `'full'` (the default) shows the Draft/Published tabs and the Publish,
	 * Schedule and Unpublish controls. `'status'` shows only whether the work is
	 * saved, for a `liveEdit` record that is live as soon as it saves; a save that
	 * couldn't go live (it fails validation) says so instead of "Saved".
	 */
	controls?: 'full' | 'status';
}

export interface DocumentType {
	id?: string;
	type: 'document';
	name: string;
	title: string;
	description?: string;
	/**
	 * What an empty list of this type says under "No … yet", in place of "Add your
	 * first one with the + button above": for a type people don't make themselves
	 * ("When someone sends your contact form, it shows up here.").
	 */
	emptyText?: string;
	icon?: typeof LucideIcon;
	group?: string;
	groups?: FieldGroup[];
	/** Sections to lay the fields out in. See `Fieldset`. */
	fieldsets?: Fieldset[];
	fields: Field[];
	preview?: PreviewConfig;
	/**
	 * Fields the admin document list searches against. Unset falls back to the
	 * `preview.select.title` path plus the conventional `title`/`heading`/`name`/
	 * `label`/`slug` fields. Pass explicit paths for full control, or generate
	 * them from every top-level string-ish field with `searchableFields(schema)`
	 * (`@aphexcms/cms-core/schema`).
	 */
	search?: SearchFieldConfig[];
	orderings?: Ordering[];
	access?: SchemaAccess;
	/**
	 * Capabilities a caller must hold, every one of them, for this type to exist
	 * for them. Meant for what an organization has rather than what a role may do
	 * (`organizationCapabilities` in the config): a shop's products, a booking
	 * service's bookings.
	 *
	 * Without them, every operation on the type is refused, whatever the role, and
	 * the admin leaves it out of the sidebar and type lists. An admin's bypass
	 * doesn't reach an organization capability. System contexts (`overrideAccess`)
	 * aren't gated, so jobs, seeds and site pages still read; a site checks
	 * `siteContext(...).capabilities()` itself.
	 *
	 * @example requiredCapabilities: ['site.shop']
	 */
	requiredCapabilities?: string[];
	/**
	 * When true, the schema represents a single global document (e.g. site
	 * navigation, footer). Only one row exists, its id equals the schema name,
	 * and the admin UI hides Create/Delete affordances. Ignored on object types.
	 */
	/**
	 * No drafts: every save is published straight away. For records rather than
	 * content, such as clients, tax rates or a settings page, that people edit and
	 * expect to apply, and never think to publish. A document referencing one can
	 * always be published, since the record is always live.
	 *
	 * A save that wouldn't pass publish validation, or by a role that can't
	 * publish, stays a draft until a later save fixes it.
	 */
	liveEdit?: boolean;
	/**
	 * How the editor presents publishing. Unset keeps the standard editor: the
	 * Draft/Published tabs, Publish, Schedule and Unpublish, in the usual words.
	 * For apps whose documents aren't "published" in the CMS sense, such as an
	 * invoice that's "sent" or a record that simply saves.
	 */
	publishing?: PublishingOptions;
	singleton?: boolean;
	/**
	 * URL (or resolver) for the live preview iframe in presentation mode.
	 * A string is used as-is (good for singletons like '/about').
	 * A function receives the current draft data, the organization's id and the
	 * document's own id (null before its first save), and should return a URL
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
		| ((
				doc: Record<string, unknown>,
				orgId: string | null,
				documentId: string | null
		  ) => string | null | undefined);
	/**
	 * The size the preview page is drawn at, for documents that are a fixed-size
	 * page rather than a website: an invoice, a quote, a certificate. The preview
	 * opens fitted, the page drawn at this size and scaled down to the pane, the
	 * way a PDF viewer shows a whole page. Unset, the preview behaves like a browser
	 * at the pane's width, which is right for a website. Either way the toolbar's
	 * Fit button switches between the two.
	 */
	previewFrame?: PreviewFrame;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

/** See {@link DocumentType.previewFrame}. In CSS pixels. */
export interface PreviewFrame {
	/** The page's width. Fit scales this to the pane's width. */
	width: number;
	/**
	 * The page's height. With it, Fit shows the whole page, scaling to whichever of
	 * width or height runs out first. Without it, Fit matches the width and the
	 * page scrolls.
	 */
	height?: number;
}

export interface ObjectType {
	type: 'object';
	/** A starting value for the whole object when it is added to an array: an object, or a function returning one. Like Sanity's. */
	initialValue?: ObjectInitialValue;
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
	/**
	 * Capabilities a caller must hold to add this type to an array, such as a
	 * "Book now" block that needs `site.bookings`. Without them the admin's insert
	 * menus leave it out and a save that adds one is refused. Items already in a
	 * document stay and save untouched, so an organization that loses a feature
	 * keeps its content. See DocumentType.requiredCapabilities.
	 */
	requiredCapabilities?: string[];
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
	/**
	 * Read other documents, as the writer and in the writer's organization: the
	 * settings a default comes from, the last number used, a referenced document.
	 * There's no way to write through it. A write elsewhere is a side effect, and
	 * belongs in an event consumer.
	 */
	read: DocumentHookReader;
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

/** A stored reference, as a field or an array item holds it. */
export interface ReferenceValue {
	_type: 'reference';
	_ref: string;
	_key?: string;
}

type StringFieldType = 'string' | 'text' | 'url' | 'slug' | 'date' | 'datetime';

/**
 * The stored value of one array item. Mirrors `aphex generate:types`, so a hook's
 * `data` and the generated document type agree: inline objects carry the `_key`
 * and `_type` the editor adds, references are `{ _type, _ref }`, primitives are
 * themselves. An item naming an object schema (`{ type: 'address' }`) is
 * `unknown`, because that schema isn't visible from the field list. Neither is
 * rich text, whose blocks the generated `PortableTextBlock` types.
 */
type ArrayItemTSType<I> = I extends { type: 'reference' }
	? ReferenceValue
	: I extends { type: 'object'; fields: infer Fields extends readonly Field[] }
		? { _key?: string; _type?: string } & InferFields<Fields>
		: I extends { type: StringFieldType }
			? string
			: I extends { type: 'number' }
				? number
				: I extends { type: 'boolean' }
					? boolean
					: I extends { type: 'image' }
						? ImageValue & { _key?: string }
						: I extends { type: 'file' }
							? FileValue & { _key?: string }
							: unknown;

/**
 * Map a single field's declared `type` to the TS type of its stored value, the
 * same shape `aphex generate:types` writes. Arrays and inline objects are typed
 * from their own fields, recursively.
 */
export type FieldTSType<F extends Field> = F['type'] extends StringFieldType
	? string
	: F['type'] extends 'number'
		? number
		: F['type'] extends 'boolean'
			? boolean
			: F['type'] extends 'reference'
				? ReferenceValue
				: F extends { type: 'array'; of: infer Of extends readonly unknown[] }
					? ArrayItemTSType<Of[number]>[]
					: F extends { type: 'object'; fields: infer Fields extends readonly Field[] }
						? InferFields<Fields>
						: F['type'] extends 'image'
							? ImageValue
							: F['type'] extends 'file'
								? FileValue
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
	/** A starting value for the whole object when it is added to an array: an object, or a function returning one. Like Sanity's. */
	initialValue?: ObjectInitialValue;
	type: 'document' | 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	group?: string;
	groups?: FieldGroup[];
	/** Sections to lay the fields out in. See `Fieldset`. */
	fieldsets?: Fieldset[];
	fields: Field[];
	preview?: PreviewConfig;
	/** See DocumentType.search for full docs. */
	search?: SearchFieldConfig[];
	orderings?: Ordering[];
	access?: SchemaAccess;
	/** See DocumentType.emptyText. */
	emptyText?: string;
	/**
	 * Capabilities a caller needs for this type: every operation on a document
	 * type, adding an object type to an array. See DocumentType.requiredCapabilities.
	 */
	requiredCapabilities?: string[];
	/** Save-time normalization + invariant hooks. See {@link SchemaHooks}. */
	hooks?: SchemaHooks;
	/** Document-only: single global instance with id === name. */
	/** See DocumentType.liveEdit. */
	liveEdit?: boolean;
	/** See DocumentType.publishing. */
	publishing?: PublishingOptions;
	singleton?: boolean;
	/** See DocumentType.previewUrl for full docs. */
	previewUrl?:
		| string
		| ((
				doc: Record<string, unknown>,
				orgId: string | null,
				documentId: string | null
		  ) => string | null | undefined);
	/** See DocumentType.previewFrame. */
	previewFrame?: PreviewFrame;
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
	/** Sections to lay the fields out in. See `Fieldset`. */
	fieldsets?: Fieldset[];
	fields: Field[];
	preview?: PreviewConfig;
	orderings?: Ordering[];
	access?: SchemaAccess;
	/** See DocumentType.previewUrl for full docs. */
	previewUrl?:
		| string
		| ((
				doc: Record<string, unknown>,
				orgId: string | null,
				documentId: string | null
		  ) => string | null | undefined);
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
