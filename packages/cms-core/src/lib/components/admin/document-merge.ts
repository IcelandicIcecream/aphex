/**
 * Three-way merge of a document's data, for when someone else (another tab, an AI
 * agent over MCP) saves the document while it's open in the editor.
 *
 * - `base`: what this editor last read or saved: what both sides started from.
 * - `local`: the editor's data now, unsaved edits included.
 * - `remote`: what was saved elsewhere since.
 *
 * Field by field: a field only one side changed takes that side's value; a field
 * both changed the same way is that value; a field both changed differently is a
 * conflict, and keeps the local value (nothing typed here is lost) with its path
 * listed. Objects merge field by field. Arrays whose items all carry a `_key`
 * (blocks, rich text) merge item by item: an item added on either side is kept,
 * an item removed on one side and untouched on the other goes, and one removed on
 * one side but edited on the other stays and is a conflict. Any other array (a
 * list of tags, of strings) is one value.
 *
 * Pure: no Svelte, no network. The editor decides what to do with the result.
 */

export interface MergeResult {
	/** The merged data: remote's changes applied to local, local's kept. */
	merged: Record<string, unknown>;
	/** Paths both sides changed differently (`hero.heading`, `blocks[_key=="a1"].title`). Local's value is kept at each. */
	conflicts: string[];
}

type Plain = Record<string, unknown>;
type Keyed = Plain & { _key: string };

const isPlain = (value: unknown): value is Plain =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const isKeyedArray = (value: unknown): value is Keyed[] =>
	Array.isArray(value) && value.every((item) => isPlain(item) && typeof item._key === 'string');

/** Stable comparison: key order doesn't count; undefined and a missing key are the same. */
export function sameValue(a: unknown, b: unknown): boolean {
	return stable(a) === stable(b);
}

function stable(value: unknown): string {
	return (
		JSON.stringify(value, (_key, inner) =>
			isPlain(inner)
				? Object.fromEntries(
						Object.keys(inner)
							.sort()
							.filter((key) => inner[key] !== undefined)
							.map((key) => [key, inner[key]])
					)
				: inner
		) ?? 'undefined'
	);
}

export function mergeDocuments(base: Plain, local: Plain, remote: Plain): MergeResult {
	const conflicts: string[] = [];
	const merged = mergeObject(base ?? {}, local ?? {}, remote ?? {}, '', conflicts);
	return { merged, conflicts };
}

function mergeValue(
	base: unknown,
	local: unknown,
	remote: unknown,
	path: string,
	conflicts: string[]
): unknown {
	if (sameValue(local, remote)) return local;
	if (sameValue(local, base)) return remote;
	if (sameValue(remote, base)) return local;
	// Both changed it, differently: merge inside it when it has parts.
	if (isPlain(local) && isPlain(remote)) {
		return mergeObject(isPlain(base) ? base : {}, local, remote, path, conflicts);
	}
	if (isKeyedArray(local) && isKeyedArray(remote)) {
		return mergeKeyed(isKeyedArray(base) ? base : [], local, remote, path, conflicts);
	}
	conflicts.push(path || '(document)');
	return local;
}

function mergeObject(
	base: Plain,
	local: Plain,
	remote: Plain,
	path: string,
	conflicts: string[]
): Plain {
	const out: Plain = {};
	const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
	for (const key of keys) {
		const value = mergeValue(
			base[key],
			local[key],
			remote[key],
			path ? `${path}.${key}` : key,
			conflicts
		);
		if (value !== undefined) out[key] = value;
	}
	return out;
}

function mergeKeyed(
	base: Keyed[],
	local: Keyed[],
	remote: Keyed[],
	path: string,
	conflicts: string[]
): Keyed[] {
	const byKey = (items: Keyed[]) => new Map(items.map((item) => [item._key, item]));
	const b = byKey(base);
	const l = byKey(local);
	const r = byKey(remote);
	const at = (key: string) => `${path}[_key=="${key}"]`;

	// What each item becomes, or undefined when it's gone.
	const result = new Map<string, Keyed>();
	for (const key of new Set([...l.keys(), ...r.keys(), ...b.keys()])) {
		const inBase = b.get(key);
		const inLocal = l.get(key);
		const inRemote = r.get(key);
		if (inLocal && inRemote) {
			result.set(key, mergeValue(inBase, inLocal, inRemote, at(key), conflicts) as Keyed);
		} else if (inLocal && !inRemote) {
			if (!inBase)
				result.set(key, inLocal); // added here
			else if (!sameValue(inLocal, inBase)) {
				// removed there, edited here: keep the edit, and say so
				conflicts.push(at(key));
				result.set(key, inLocal);
			} // else removed there, untouched here: gone
		} else if (inRemote && !inLocal) {
			if (!inBase)
				result.set(key, inRemote); // added there
			else if (!sameValue(inRemote, inBase)) {
				// removed here, edited there: keep their edit, and say so
				conflicts.push(at(key));
				result.set(key, inRemote);
			} // else removed here, untouched there: gone
		}
	}

	// Order: the side that reordered wins; the other side's new items follow the item
	// they came after on their side (or go first).
	const orderOf = (items: Keyed[]) => items.map((item) => item._key).filter((key) => b.has(key));
	const baseOrder = base.map((item) => item._key);
	const commonOrder = (items: Keyed[]) => orderOf(items).filter((key) => l.has(key) && r.has(key));
	const localMoved = !sameValue(
		commonOrder(local),
		baseOrder.filter((key) => l.has(key) && r.has(key))
	);
	const [lead, other] = localMoved ? [local, remote] : [remote, local];

	const order = lead.map((item) => item._key);
	other.forEach((item, index) => {
		if (order.includes(item._key)) return;
		const before = index > 0 ? (other[index - 1]?._key ?? null) : null;
		const where = before === null ? -1 : order.indexOf(before);
		order.splice(where + 1, 0, item._key);
	});
	// Anything kept that neither list placed (removed on both sides but kept as a conflict).
	for (const key of result.keys()) if (!order.includes(key)) order.push(key);

	return order.filter((key) => result.has(key)).map((key) => result.get(key)!);
}

/**
 * `current` with `next`'s data, as a new object: what watches the document (the
 * preview's live data) is told by the replacement, not by a field set in place.
 * A field that didn't change keeps its very same value, so one being typed in (a
 * cursor in rich text) isn't disturbed.
 */
export function replaceChanged(current: Plain, next: Plain): Plain {
	return Object.fromEntries(
		Object.entries(next).map(([key, value]) => [
			key,
			sameValue(current[key], value) ? current[key] : structuredClone(value)
		])
	);
}

/** What an open editor should do about a version saved elsewhere. */
export type RemoteAction =
	/** Nothing unsaved here: show theirs. */
	| { kind: 'take'; data: Record<string, unknown> }
	/** Unsaved edits here, on other fields than theirs: both, merged. */
	| { kind: 'merge'; data: Record<string, unknown> }
	/** Both changed the same field: the editor asks before anything is replaced. */
	| { kind: 'conflict'; data: Record<string, unknown>; conflicts: string[] };

export function reconcile(base: Plain, local: Plain, remote: Plain): RemoteAction {
	if (sameValue(local, base)) return { kind: 'take', data: remote };
	const { merged, conflicts } = mergeDocuments(base, local, remote);
	return conflicts.length > 0
		? { kind: 'conflict', data: merged, conflicts }
		: { kind: 'merge', data: merged };
}
