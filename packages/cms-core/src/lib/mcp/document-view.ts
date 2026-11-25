/**
 * What an agent reads of a document. Every token a model reads is paid for, so a
 * read answers with what the request asked for: a few fields, one block (`path`),
 * or the whole page skimmed (every key and `_type`, the text cut short), which
 * is enough to find the block to patch. `_meta` keeps only what a model acts on.
 */
import { readPath } from '../local-api/patch';
import { unknownFields } from '../field-validation/new-fields';
import type { SchemaType } from '../types/schemas';
import { SKIM_MARK } from '../field-validation/skim-mark';

export interface DocumentViewOptions {
	/** Top-level fields to return; all when empty. */
	fields?: string[];
	/** One value inside the document, e.g. blocks[_key=="k3"]. */
	path?: string;
	/** An index of the document: lists as their items' keys, types and labels. */
	skim?: boolean;
	/** Skim one list deep rather than two. */
	flat?: boolean;
}

/** Text longer than this is cut when skimming. */
export const SKIM_LENGTH = 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

function cut(text: string): string {
	return text.length > SKIM_LENGTH ? `${text.slice(0, SKIM_LENGTH - 1)}…` : text;
}

const LABEL_FIELDS = ['heading', 'title', 'name', 'label', 'question', 'value', 'text'];

/** A rich-text block's plain text. */
function blockText(value: Record<string, unknown>): string | undefined {
	if (value._type !== 'block' || !Array.isArray(value.children)) return undefined;
	return value.children
		.map((child) => (isRecord(child) && typeof child.text === 'string' ? child.text : ''))
		.join('');
}

/** What an item is, in a few words: its heading, title or name, else its first text. */
function labelOf(item: Record<string, unknown>): string | undefined {
	const text = blockText(item);
	if (text !== undefined) return cut(text);
	for (const field of LABEL_FIELDS) {
		const value = item[field];
		if (typeof value === 'string' && value) return cut(value);
	}
	for (const [key, value] of Object.entries(item)) {
		if (!key.startsWith('_') && typeof value === 'string' && value.includes(' ')) return cut(value);
	}
	return undefined;
}

/** A list item as an index entry: its key, type and label, and the keys of the lists inside it. */
function entry(item: unknown, depth: number): unknown {
	if (!isRecord(item)) return typeof item === 'string' ? cut(item) : item;
	const out: Record<string, unknown> = {};
	if (typeof item._key === 'string') out._key = item._key;
	if (typeof item._type === 'string') out._type = item._type;
	out[SKIM_MARK] = labelOf(item) ?? '';
	if (depth < 2) {
		for (const [key, value] of Object.entries(item)) {
			if (Array.isArray(value) && value.some(isRecord))
				out[key] = value.map((child) => entry(child, depth + 1));
		}
	}
	return out;
}

/**
 * A document as an index: short fields as they are (text cut short), and every
 * list as its items' keys, types and labels, two lists deep. Enough to find the
 * block to read with `path` or change with patch_document.
 */
export function skim(value: unknown, flat = false): unknown {
	const depth = flat ? 2 : 1;
	if (!isRecord(value))
		return Array.isArray(value) ? value.map((item) => entry(item, depth)) : value;
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(value)) {
		if (typeof field === 'string') out[key] = cut(field);
		else if (Array.isArray(field)) out[key] = field.map((item) => entry(item, depth));
		else if (!isRecord(field)) out[key] = field;
		// An object field (seo, style) is left out: read it with fields or path.
		else out[key] = '{…}';
	}
	return out;
}

/** `_meta` as an agent needs it: whether it's live, the revision to send back, and when. */
function slimMeta(meta: unknown): Record<string, unknown> | undefined {
	if (!isRecord(meta)) return undefined;
	const out: Record<string, unknown> = {};
	for (const key of [
		'type',
		'status',
		'hasUnpublishedChanges',
		'revision',
		'updatedAt',
		'publishedAt'
	]) {
		if (meta[key] !== undefined && meta[key] !== null) out[key] = meta[key];
	}
	return out;
}

/** Leftovers listed at most; a page full of them needs no more to make the point. */
const LEFTOVERS_LISTED = 20;

/**
 * Where what's being read holds values the schema has no field for. They aren't
 * shown on the site, and nothing else about them says so. Retired (`deprecated`)
 * fields aren't among them: those still work.
 */
function leftovers(
	source: Record<string, unknown>,
	{ fields, path }: DocumentViewOptions,
	schema: SchemaType,
	schemas: readonly SchemaType[]
): { note: string; paths: string[] } | undefined {
	const within = (at: string) =>
		!path || at === path || at.startsWith(`${path}.`) || at.startsWith(`${path}[`);
	const paths = unknownFields(schema, source, schemas)
		.filter((field) => within(field.path) || within(field.keyPath))
		.filter((field) => path || !fields?.length || fields.includes(String(field.segments[0])))
		.map((field) => field.keyPath);
	if (paths.length === 0) return undefined;
	const more = paths.length - LEFTOVERS_LISTED;
	return {
		note: `Old values from fields that were removed: not shown anywhere. Don't copy them or rely on them.${more > 0 ? ` And ${more} more.` : ''}`,
		paths: paths.slice(0, LEFTOVERS_LISTED)
	};
}

export function viewDocument(
	doc: object,
	options: DocumentViewOptions = {},
	schema?: SchemaType,
	schemas: readonly SchemaType[] = []
): Record<string, unknown> {
	const { fields, path } = options;
	const source: Record<string, unknown> = { ...doc };
	const id = source.id;
	const meta = slimMeta(source._meta);
	delete source.id;
	delete source._meta;
	const notInSchema = schema && leftovers(source, options, schema, schemas);
	const about = notInSchema ? { ...meta, notInSchema } : meta;
	const head = { ...(id !== undefined ? { id } : {}), ...(about ? { _meta: about } : {}) };
	if (path) {
		const value = readPath(source, path);
		return { ...head, path, value: options.skim ? skim(value, options.flat) : value };
	}
	const picked = fields?.length
		? Object.fromEntries(
				fields.filter((field) => field in source).map((field) => [field, source[field]])
			)
		: source;
	const body = options.skim ? skim(picked, options.flat) : picked;
	return { ...head, ...(isRecord(body) ? body : {}) };
}

/** Reads the view options a read tool was given. */
export function viewOptions(args: Record<string, unknown>): DocumentViewOptions {
	const fields = Array.isArray(args.fields)
		? args.fields.filter((f): f is string => typeof f === 'string')
		: undefined;
	return {
		...(fields?.length ? { fields } : {}),
		...(typeof args.path === 'string' && args.path ? { path: args.path } : {}),
		...(args.skim === true ? { skim: true } : {})
	};
}
