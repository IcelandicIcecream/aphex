import type { SchemaType } from '../types/schemas';

/**
 * Walk a dot-path (e.g. `seo.title`) through an object. Returns the
 * terminal value, or `undefined` if any segment along the way is missing.
 */
export function readPath(item: any, path: string): unknown {
	let current: any = item;
	for (const segment of path.split('.')) {
		if (current == null) return undefined;
		current = current[segment];
	}
	return current;
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
 * Resolve the title to display for an item (array row, document list row,
 * reference picker row). Honors `schema.preview.select.title` first
 * (with dot-path support), then falls back to the conventional field
 * names, then the schema's own title, then the type name.
 */
export function resolvePreviewTitle(
	item: any,
	schema: SchemaType | null | undefined,
	defaultTypeLabel?: string
): string {
	const configured = schema?.preview?.select?.title;
	if (configured) {
		const resolved = toPreviewString(readPath(item, configured));
		if (resolved) return resolved;
	} else {
		for (const name of DEFAULT_TITLE_FIELDS) {
			const resolved = toPreviewString(item?.[name]);
			if (resolved) return resolved;
		}
	}
	return schema?.title ?? defaultTypeLabel ?? 'Untitled';
}

/**
 * Resolve the subtitle to display for an item. Returns `null` when no
 * subtitle is configured or the configured field is empty — callers
 * should branch on the null and skip rendering the subtitle line.
 */
export function resolvePreviewSubtitle(
	item: any,
	schema: SchemaType | null | undefined
): string | null {
	const configured = schema?.preview?.select?.subtitle;
	if (!configured) return null;
	return toPreviewString(readPath(item, configured));
}
