import type { PreviewConfig, SchemaType } from '../types/schemas';

/**
 * The minimum a thing needs to drive a preview row: an optional fallback `title`
 * and a `preview` config. Structural on purpose — both `SchemaType` (documents /
 * objects) and `TypeReference` (array members, Portable Text block types) satisfy
 * it, so array rows and rich-text block cards share one resolver.
 */
export type PreviewSource =
	| { title?: string; icon?: any; preview?: PreviewConfig; fields?: readonly unknown[] }
	| null
	| undefined;

/**
 * A selected value as a person reads it: a field with a `list` of options shows
 * the option's title ("Full bleed"), not the stored value (`fullBleed`). Only for
 * a top-level field; anything else is returned as it is.
 */
function asListed(value: unknown, schema: PreviewSource, path: string): unknown {
	if (typeof value !== 'string' || path.includes('.')) return value;
	const field = (schema?.fields as { name?: string; list?: unknown }[] | undefined)?.find(
		(f) => f?.name === path
	);
	if (!Array.isArray(field?.list)) return value;
	const option = (field.list as unknown[]).find(
		(entry) => entry && typeof entry === 'object' && (entry as { value?: unknown }).value === value
	) as { title?: unknown } | undefined;
	return typeof option?.title === 'string' && option.title ? option.title : value;
}

/**
 * Walk a dot-path (e.g. `seo.title`) through an object. Returns the
 * terminal value, or `undefined` if any segment along the way is missing.
 *
 * Quoted strings (single or double) are treated as literals and returned
 * as-is, e.g. `'"My Title"'` → `'My Title'`. Useful for singletons or
 * any schema that needs a static preview title.
 */
export function readPath(item: any, path: string): unknown {
	const match = path.match(/^(['"])(.+)\1$/);
	if (match) return match[2];

	let current: any = item;
	for (const segment of path.split('.')) {
		if (current == null) return undefined;
		// A reference resolved with `depth > 0` is the target document itself
		// (`{ id, ...fields, _meta }`), so `voice.name` reads straight through.
		current = current[segment];
	}
	return current;
}

/**
 * The `reference` fields a schema's `preview.select` reads through: `dish` for
 * `dish.name`. What a preview has to load before it can show those paths.
 */
export function previewReferenceFields(
	schema: Pick<SchemaType, 'fields' | 'preview'> | null | undefined
): string[] {
	const select = schema?.preview?.select;
	if (!select) return [];
	const refs = new Set(
		(schema?.fields ?? []).filter((f) => f.type === 'reference').map((f) => f.name)
	);
	const through = new Set<string>();
	for (const path of Object.values(select)) {
		if (typeof path !== 'string' || /^['"]/.test(path)) continue;
		const dot = path.indexOf('.');
		if (dot > 0 && refs.has(path.slice(0, dot))) through.add(path.slice(0, dot));
	}
	return [...through];
}

/**
 * How deep the list fetch must resolve for this schema's `preview.select`
 * to read what it asks for: 1 when any selected path starts at a
 * `reference` field (`voice.name`), else 0. Kept minimal on purpose — a
 * list page shouldn't pay for resolution the row never shows.
 */
export function previewDepth(schema: SchemaType | undefined): 0 | 1 {
	return previewReferenceFields(schema).length > 0 ? 1 : 0;
}

/**
 * `item` with each reference its preview reads through (`fields`, from
 * `previewReferenceFields`) swapped for the document it points at, where `docs`
 * has it, so `dish.name` reads the dish's name. An array row's object holds only
 * `{ _ref }`; a list fetched with `depth` already holds the document.
 */
export function withPreviewReferences<T>(
	item: T,
	fields: readonly string[],
	docs: ReadonlyMap<string, unknown>
): T {
	if (!item || typeof item !== 'object' || fields.length === 0) return item;
	let out: Record<string, unknown> | null = null;
	for (const name of fields) {
		const ref = (item as Record<string, { _ref?: unknown } | undefined>)[name]?._ref;
		const doc = typeof ref === 'string' ? docs.get(ref) : undefined;
		if (doc) (out ??= { ...(item as Record<string, unknown>) })[name] = doc;
	}
	return (out ?? item) as T;
}

/**
 * Coerce a value into a printable string for preview rows. Returns `null`
 * when the value isn't worth rendering (empty, nullish, non-primitive).
 */
function toPreviewString(value: unknown): string | null {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	}
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	return null;
}

/**
 * Conventional fallback field names for the title slot when a schema
 * doesn't declare a `preview.select.title`. Mirrors Sanity's heuristic
 * — the first non-empty string wins.
 */
const DEFAULT_TITLE_FIELDS = ['title', 'heading', 'name', 'label'];

/**
 * The top-level field a typed name belongs in — what "Create \"Acme\"" from a
 * reference picker fills, so the new document previews as the name the editor
 * typed rather than as its type name. Follows `resolvePreviewTitle`'s order:
 * `preview.select.title` when it names a plain string field of this schema, else
 * the first conventional title field the schema declares. `null` when there is no
 * such field (the title comes from `prepare`, a nested path or a reference), in
 * which case the caller creates the document empty.
 */
export function titleFieldName(schema: SchemaType | null | undefined): string | null {
	if (!schema) return null;
	const isText = (name: string) =>
		schema.fields.some((f) => f.name === name && (f.type === 'string' || f.type === 'text'));
	const selected = schema.preview?.select?.title;
	if (typeof selected === 'string' && !selected.includes('.') && !/^['"]/.test(selected)) {
		return isText(selected) ? selected : null;
	}
	if (schema.preview?.prepare || schema.preview?.title) return null;
	return DEFAULT_TITLE_FIELDS.find(isText) ?? null;
}

/**
 * Run `preview.prepare` if defined: resolve every dot-path in `select`,
 * pass the resolved selection map to `prepare`, and return the result.
 * Returns `null` when no `prepare` is configured — callers should fall
 * back to direct `select.title` / `select.subtitle` reads in that case.
 */
function runPrepare(
	item: any,
	schema: PreviewSource
): { title?: string; subtitle?: string; media?: string } | null {
	const prepare = schema?.preview?.prepare;
	if (!prepare) return null;
	const select = schema?.preview?.select ?? {};
	const selection: Record<string, unknown> = {};
	for (const [key, path] of Object.entries(select)) {
		selection[key] = readPath(item, path);
	}
	return prepare(selection);
}

/**
 * Resolve the title to display for an item (array row, document list row,
 * reference picker row, editor breadcrumb). Precedence: `preview.prepare()` →
 * literal `preview.title` → `select.title` dot-path → conventional field names →
 * schema title → type name.
 */
export function resolvePreviewTitle(
	item: any,
	schema: PreviewSource,
	defaultTypeLabel?: string
): string {
	const prepared = runPrepare(item, schema);
	if (prepared) {
		const resolved = toPreviewString(prepared.title);
		if (resolved) return resolved;
	} else {
		// Literal static override — used as-is, no data lookup.
		const literal = toPreviewString(schema?.preview?.title);
		if (literal) return literal;

		const configured = schema?.preview?.select?.title;
		if (configured) {
			const resolved = toPreviewString(asListed(readPath(item, configured), schema, configured));
			if (resolved) return resolved;
		} else {
			for (const name of DEFAULT_TITLE_FIELDS) {
				const resolved = toPreviewString(item?.[name]);
				if (resolved) return resolved;
			}
		}
	}
	return schema?.title ?? defaultTypeLabel ?? 'Untitled';
}

/**
 * Resolve the subtitle to display for an item. Returns `null` when no
 * subtitle is configured or the configured field is empty — callers
 * should branch on the null and skip rendering the subtitle line.
 */
export function resolvePreviewSubtitle(item: any, schema: PreviewSource): string | null {
	const prepared = runPrepare(item, schema);
	if (prepared) return toPreviewString(prepared.subtitle);
	const configured = schema?.preview?.select?.subtitle;
	if (!configured) return null;
	return toPreviewString(asListed(readPath(item, configured), schema, configured));
}

/** The asset id in an image value (`{ asset: { _ref } }`), or the string when it's one. */
function assetRefOf(value: unknown): string | null {
	if (typeof value === 'string') return value || null;
	const ref = (value as { asset?: { _ref?: unknown } } | null)?.asset?._ref;
	return typeof ref === 'string' && ref ? ref : null;
}

/**
 * The picture to show for an item (a custom block's card in rich text), as an asset
 * id. Precedence: `preview.prepare().media` → `select.media` dot-path → the item's
 * first image (a top-level field holding `{ asset: { _ref } }`), so a block with a
 * photo shows it without any preview config. Null when it has none.
 */
export function resolvePreviewMedia(item: any, schema: PreviewSource): string | null {
	const prepared = runPrepare(item, schema);
	if (prepared?.media) return assetRefOf(prepared.media);
	const configured = schema?.preview?.select?.media;
	if (configured) return assetRefOf(readPath(item, configured));
	if (!item || typeof item !== 'object') return null;
	for (const [key, value] of Object.entries(item)) {
		if (key.startsWith('_') || typeof value !== 'object') continue;
		const ref = assetRefOf(value);
		if (ref) return ref;
	}
	return null;
}
