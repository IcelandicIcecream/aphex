/**
 * `depth`: replace references with the documents they point at.
 *
 * Every target is read the way a direct read of it would be, as the same caller
 * and in the same perspective: its own type's read permission and
 * `requiredCapabilities`, its hidden fields stripped, and in the published
 * perspective only if it is published. A target the caller can't read, a dangling
 * one, or one that would close a cycle stays the bare `{ _type: 'reference', _ref }`
 * the caller could already see at depth 0.
 *
 * This used to happen inside the database adapters, which read each target as a
 * raw row: a document anyone could read handed over every document it referenced,
 * whatever the caller was allowed, with the target's draft in it even in the
 * published perspective.
 */

/** Reads documents by id as the caller; ids it may not read are left out. */
export type ReferenceReader = (ids: string[]) => Promise<Array<Record<string, unknown>>>;

interface Reference {
	_type: 'reference';
	_ref: string;
	_key?: string;
}

function isReference(value: unknown): value is Reference {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		(value as Record<string, unknown>)._type === 'reference' &&
		typeof (value as Record<string, unknown>)._ref === 'string'
	);
}

/** A document's own data: everything but its metadata. */
function* fieldsOf(value: unknown): Generator<unknown> {
	if (Array.isArray(value)) {
		yield* value;
	} else if (value && typeof value === 'object') {
		for (const [key, field] of Object.entries(value)) {
			if (key !== '_meta') yield field;
		}
	}
}

function collectReferences(value: unknown, into: Set<string>): void {
	if (isReference(value)) {
		into.add(value._ref);
		return;
	}
	for (const field of fieldsOf(value)) collectReferences(field, into);
}

function replaceReferences(value: unknown, targets: Map<string, unknown>): unknown {
	if (isReference(value)) {
		const target = targets.get(value._ref);
		if (target === undefined) return value;
		// An array item keeps its `_key`, so a keyed list renders the same either way.
		return value._key !== undefined
			? { ...(target as Record<string, unknown>), _key: value._key }
			: target;
	}
	if (Array.isArray(value)) return value.map((item) => replaceReferences(item, targets));
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, field] of Object.entries(value)) {
			out[key] = key === '_meta' ? field : replaceReferences(field, targets);
		}
		return out;
	}
	return value;
}

interface Node {
	value: unknown;
	/** The documents above this one, itself included: following one again is a cycle. */
	path: ReadonlySet<string>;
}

/** One level per call, so `depth` levels cost `depth` batched reads. */
async function expandLevel(
	nodes: Node[],
	remaining: number,
	read: ReferenceReader
): Promise<unknown[]> {
	const wanted = nodes.map((node) => {
		const ids = new Set<string>();
		collectReferences(node.value, ids);
		for (const id of node.path) ids.delete(id);
		return ids;
	});
	const all = new Set(wanted.flatMap((ids) => [...ids]));
	if (all.size === 0) return nodes.map((node) => node.value);

	const found = new Map<string, Record<string, unknown>>();
	for (const doc of await read([...all])) {
		if (typeof doc.id === 'string') found.set(doc.id, doc);
	}

	// Each occurrence goes one level deeper along its own path, so a document
	// reached twice through different parents is expanded under each of them.
	const children: Array<{ owner: number; id: string; node: Node }> = [];
	wanted.forEach((ids, owner) => {
		for (const id of ids) {
			const target = found.get(id);
			if (target)
				children.push({
					owner,
					id,
					node: { value: target, path: new Set([...nodes[owner]!.path, id]) }
				});
		}
	});
	const expanded =
		remaining > 1
			? await expandLevel(
					children.map((child) => child.node),
					remaining - 1,
					read
				)
			: children.map((child) => child.node.value);

	const targets = nodes.map(() => new Map<string, unknown>());
	children.forEach((child, i) => targets[child.owner]!.set(child.id, expanded[i]));
	return nodes.map((node, i) => replaceReferences(node.value, targets[i]!));
}

/**
 * Expand the references in `docs` (already projected for the caller) `depth`
 * levels deep. Depth 0 returns them untouched.
 */
export async function expandReferences<D>(
	docs: D[],
	depth: number,
	read: ReferenceReader
): Promise<D[]> {
	if (depth <= 0 || docs.length === 0) return docs;
	const nodes = docs.map((doc) => {
		const id = (doc as { id?: unknown } | null)?.id;
		return { value: doc, path: new Set(typeof id === 'string' ? [id] : []) };
	});
	return (await expandLevel(nodes, depth, read)) as D[];
}
