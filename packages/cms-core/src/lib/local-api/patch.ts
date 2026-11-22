/**
 * Path-addressed edits to a document's data, so a caller changes one heading in a
 * page of twenty blocks by naming it, rather than sending all twenty back. Used by
 * the `patch_document` agent tool; pure, so it can run anywhere.
 *
 * A path is field names joined by dots, with array items addressed by `_key`
 * (`blocks[_key=="k3"].heading`) or, less safely, by index (`blocks[2]`). A key is
 * stable when someone else inserts a block in between; an index is not.
 *
 * Operations apply in order, all or none: the first that can't apply fails the
 * whole patch with a message naming it, and the input is never changed.
 */

export type PatchOperation =
	| { op: 'set'; path: string; value: unknown }
	| { op: 'unset'; path: string }
	| { op: 'insert'; path: string; position: 'before' | 'after' | 'start' | 'end'; items: unknown[] }
	| { op: 'move'; path: string; position: 'before' | 'after'; target: string }
	| { op: 'replaceText'; path: string; find: string; replace: string };

export class PatchError extends Error {
	constructor(
		message: string,
		readonly operation: number
	) {
		super(`Operation ${operation + 1}: ${message}`);
		this.name = 'PatchError';
	}
}

type Segment = { field: string } | { key: string } | { index: number };

/** `blocks[_key=="k3"].items[0].title` → its segments. */
export function parsePath(path: string): Segment[] {
	const segments: Segment[] = [];
	const pattern =
		/([A-Za-z_$][\w$]*)|\[\s*_key\s*==?\s*(?:"([^"]*)"|'([^']*)')\s*\]|\[\s*(\d+)\s*\]|(\.)/gy;
	let match: RegExpExecArray | null;
	let expectField = true;
	while (pattern.lastIndex < path.length && (match = pattern.exec(path))) {
		if (match[1] !== undefined) {
			if (!expectField) throw new Error(`Expected "." or "[" before "${match[1]}" in "${path}"`);
			segments.push({ field: match[1] });
			expectField = false;
		} else if (match[2] !== undefined || match[3] !== undefined) {
			segments.push({ key: match[2] ?? match[3] ?? '' });
			expectField = false;
		} else if (match[4] !== undefined) {
			segments.push({ index: Number(match[4]) });
			expectField = false;
		} else {
			if (expectField) throw new Error(`Unexpected "." in "${path}"`);
			expectField = true;
		}
	}
	if (pattern.lastIndex !== path.length || segments.length === 0 || expectField) {
		throw new Error(
			`Can't read the path "${path}". Use field names, [_key=="…"] or [index], e.g. blocks[_key=="k3"].heading.`
		);
	}
	return segments;
}

export function formatPath(segments: Segment[]): string {
	return segments
		.map((segment, i) =>
			'field' in segment
				? `${i === 0 ? '' : '.'}${segment.field}`
				: 'key' in segment
					? `[_key=="${segment.key}"]`
					: `[${segment.index}]`
		)
		.join('');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

/** Where a path lands: the container holding the last segment, and that segment. */
interface Slot {
	parent: Record<string, unknown> | unknown[];
	/** A property name, or an array index. */
	at: string | number;
}

function indexOf(array: unknown[], segment: Segment, path: string): number {
	if ('index' in segment) {
		if (segment.index >= array.length)
			throw new Error(`${path} is past the end of a list of ${array.length}`);
		return segment.index;
	}
	if ('key' in segment) {
		const matches = array.flatMap((item, i) =>
			isRecord(item) && item._key === segment.key ? [i] : []
		);
		const [index] = matches;
		if (index === undefined) throw new Error(`No item with _key "${segment.key}" in ${path}`);
		// Two items with one key: editing "the first" could be the wrong one, so refuse.
		if (matches.length > 1) {
			throw new Error(
				`${matches.length} items in ${path} share _key "${segment.key}" (at ${matches.join(', ')}): address one by [index] or give each its own key`
			);
		}
		return index;
	}
	throw new Error(`${path} is a list: address an item with [_key=="…"]`);
}

/** Walks to the slot a path names. With `create`, missing objects on the way are made. */
function locate(root: Record<string, unknown>, segments: Segment[], create: boolean): Slot {
	let current: unknown = root;
	for (const [i, segment] of segments.entries()) {
		const here = formatPath(segments.slice(0, i)) || 'the document';
		const last = i === segments.length - 1;
		let slot: Slot;
		if (Array.isArray(current)) {
			slot = { parent: current, at: indexOf(current, segment, here) };
		} else if (isRecord(current)) {
			if (!('field' in segment)) throw new Error(`${here} is not a list`);
			slot = { parent: current, at: segment.field };
		} else {
			throw new Error(`${here} has nothing at it to go into`);
		}
		if (last) return slot;
		const next: unknown = Array.isArray(slot.parent)
			? slot.parent[slot.at as number]
			: slot.parent[slot.at as string];
		if (next === undefined || next === null) {
			const nextSegment = segments[i + 1];
			if (!create || !nextSegment || !('field' in nextSegment) || Array.isArray(slot.parent)) {
				throw new Error(`${formatPath(segments.slice(0, i + 1))} is empty`);
			}
			const made: Record<string, unknown> = {};
			(slot.parent as Record<string, unknown>)[slot.at as string] = made;
			current = made;
		} else {
			current = next;
		}
	}
	throw new Error('Empty path');
}

function read(slot: Slot): unknown {
	return Array.isArray(slot.parent)
		? slot.parent[slot.at as number]
		: slot.parent[slot.at as string];
}

/** A key like the editor's: short, random, unique enough within one array. */
function newKey(taken: Set<string>): string {
	let key: string;
	do key = Math.random().toString(36).slice(2, 10);
	while (taken.has(key));
	taken.add(key);
	return key;
}

/** Gives every object item without a `_key` one, and refuses a key already in the list. */
function keyed(items: unknown[], existing: unknown[]): unknown[] {
	const taken = new Set(
		existing.flatMap((item) => (isRecord(item) && typeof item._key === 'string' ? [item._key] : []))
	);
	return items.map((item) => {
		if (!isRecord(item)) return item;
		if (typeof item._key === 'string' && item._key) {
			if (taken.has(item._key)) throw new Error(`_key "${item._key}" is already in this list`);
			taken.add(item._key);
			return item;
		}
		return { _key: newKey(taken), ...item };
	});
}

/** Every string under `value`, with how to put a new one back. */
function strings(
	value: unknown,
	put: (next: string) => void,
	out: { text: string; put: (next: string) => void }[]
) {
	if (typeof value === 'string') out.push({ text: value, put });
	else if (Array.isArray(value))
		value.forEach((item, i) => strings(item, (next) => (value[i] = next), out));
	else if (isRecord(value)) {
		for (const key of Object.keys(value)) {
			// Keys, types and marks aren't copy.
			if (key === '_key' || key === '_type' || key === '_ref' || key === 'marks' || key === 'style')
				continue;
			strings(value[key], (next) => (value[key] = next), out);
		}
	}
	return out;
}

function occurrences(text: string, find: string): number {
	let count = 0;
	for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + find.length)) count++;
	return count;
}

/** The value at a path, for reading one block or field without the rest. Throws when there's nothing there. */
export function readPath(data: Record<string, unknown>, path: string): unknown {
	return read(locate(data, parsePath(path), false));
}

export interface PatchResult {
	/** The patched data: a copy, the input is untouched. */
	data: Record<string, unknown>;
	/** The top-level fields the patch changed, for a partial update. */
	fields: string[];
}

/** Fields a patch may never touch: the document's own columns. */
const PROTECTED = new Set(['id', '_id', '_meta', '_type', 'type']);

export function applyPatch(
	data: Record<string, unknown>,
	operations: PatchOperation[]
): PatchResult {
	const doc: Record<string, unknown> = structuredClone(data);
	const fields = new Set<string>();
	operations.forEach((operation, n) => {
		try {
			const segments = parsePath(operation.path);
			const top = segments[0];
			if (!top || !('field' in top) || PROTECTED.has(top.field)) {
				throw new Error(`"${operation.path}" isn't a field this can change`);
			}
			fields.add(top.field);
			switch (operation.op) {
				case 'set': {
					if (operation.value === undefined)
						throw new Error('set needs a value (use unset to clear a field)');
					const slot = locate(doc, segments, true);
					let value = operation.value;
					// A new array of objects gets keys, as the editor would give it.
					if (Array.isArray(value)) value = keyed(value, []);
					// A key renamed in place may not take a neighbour's.
					const keyField = segments.at(-1);
					if (
						keyField &&
						'field' in keyField &&
						keyField.field === '_key' &&
						segments.length >= 3
					) {
						const item = locate(doc, segments.slice(0, -1), false);
						if (Array.isArray(item.parent)) {
							const list = item.parent;
							if (
								list.some((other, i) => i !== item.at && isRecord(other) && other._key === value)
							) {
								throw new Error(`_key "${String(value)}" is already in this list`);
							}
						}
					}
					// A whole list item replaced keeps its key, and may not take a neighbour's.
					if (Array.isArray(slot.parent) && isRecord(value)) {
						const list = slot.parent;
						const index = slot.at as number;
						const old = list[index];
						const oldKey = isRecord(old) && typeof old._key === 'string' ? old._key : undefined;
						if (typeof value._key !== 'string' || !value._key) {
							value = oldKey ? { ...value, _key: oldKey } : (keyed([value], list)[0] ?? value);
						} else {
							const key = value._key;
							if (list.some((item, i) => i !== index && isRecord(item) && item._key === key)) {
								throw new Error(`_key "${key}" is already in this list`);
							}
						}
					}
					if (Array.isArray(slot.parent)) slot.parent[slot.at as number] = value;
					else slot.parent[slot.at as string] = value;
					break;
				}
				case 'unset': {
					const slot = locate(doc, segments, false);
					if (Array.isArray(slot.parent)) slot.parent.splice(slot.at as number, 1);
					else delete slot.parent[slot.at as string];
					break;
				}
				case 'insert': {
					if (!Array.isArray(operation.items) || operation.items.length === 0)
						throw new Error('insert needs items');
					const lastSegment = segments.at(-1);
					const intoItem = !!lastSegment && !('field' in lastSegment);
					if (intoItem !== (operation.position === 'before' || operation.position === 'after')) {
						throw new Error(
							intoItem
								? 'start and end take the list’s path (blocks), not an item’s'
								: 'before and after take an item’s path (blocks[_key=="k3"])'
						);
					}
					if (intoItem) {
						const slot = locate(doc, segments, false);
						const list = slot.parent as unknown[];
						const items = keyed(operation.items, list);
						list.splice(
							(slot.at as number) + (operation.position === 'after' ? 1 : 0),
							0,
							...items
						);
					} else {
						const slot = locate(doc, segments, true);
						const current = read(slot);
						if (current !== undefined && current !== null && !Array.isArray(current)) {
							throw new Error(`${operation.path} is not a list`);
						}
						const list = Array.isArray(current) ? current : [];
						const items = keyed(operation.items, list);
						if (operation.position === 'start') list.unshift(...items);
						else list.push(...items);
						if (!Array.isArray(current))
							(slot.parent as Record<string, unknown>)[slot.at as string] = list;
					}
					break;
				}
				case 'move': {
					const from = locate(doc, segments, false);
					if (!Array.isArray(from.parent))
						throw new Error('move takes an item’s path (blocks[_key=="k3"])');
					const [item] = from.parent.splice(from.at as number, 1);
					const targetSegments = parsePath(operation.target);
					if (formatPath(targetSegments) === formatPath(segments))
						throw new Error('an item can’t move next to itself');
					const to = locate(doc, targetSegments, false);
					if (!Array.isArray(to.parent)) throw new Error('target must be an item in a list');
					const targetTop = targetSegments[0];
					if (targetTop && 'field' in targetTop) fields.add(targetTop.field);
					to.parent.splice((to.at as number) + (operation.position === 'after' ? 1 : 0), 0, item);
					break;
				}
				case 'replaceText': {
					if (!operation.find) throw new Error('replaceText needs the text to find');
					const slot = locate(doc, segments, false);
					const found = strings(
						read(slot),
						(next) => {
							if (Array.isArray(slot.parent)) slot.parent[slot.at as number] = next;
							else slot.parent[slot.at as string] = next;
						},
						[]
					).filter(({ text }) => text.includes(operation.find));
					const count = found.reduce((sum, { text }) => sum + occurrences(text, operation.find), 0);
					if (count === 0) {
						throw new Error(
							`"${operation.find}" isn't in ${operation.path}. In rich text, a phrase that crosses bold, italic or a link is split: find part of it.`
						);
					}
					const [only] = found;
					if (count > 1 || !only)
						throw new Error(
							`"${operation.find}" is in ${operation.path} ${count} times: give more of the text, or a narrower path`
						);
					only.put(only.text.replace(operation.find, () => operation.replace));
					break;
				}
				default:
					throw new Error(`Unknown op "${(operation as { op?: unknown }).op}"`);
			}
		} catch (error) {
			throw new PatchError(error instanceof Error ? error.message : String(error), n);
		}
	});
	return { data: doc, fields: [...fields] };
}
