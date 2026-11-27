/**
 * Following a new item in the preview: the keys of each top-level array's items,
 * and which one item, if any, was added since the last time.
 */

/** Each top-level array field's item keys, in order. */
export type ItemKeys = Record<string, string[]>;

export function itemKeysOf(document: Record<string, unknown>): ItemKeys {
	const keys: ItemKeys = {};
	for (const [field, value] of Object.entries(document)) {
		if (!Array.isArray(value)) continue;
		// A paragraph of text is an item too, but following each new one would jump
		// the preview at every Enter: only other items (a section, an embed) count.
		const itemKeys = value.map((item) => {
			const { _key, _type } = (item && typeof item === 'object' ? item : {}) as {
				_key?: unknown;
				_type?: unknown;
			};
			return typeof _key === 'string' && _type !== 'block' ? _key : '';
		});
		if (itemKeys.some(Boolean)) keys[field] = itemKeys;
	}
	return keys;
}

/**
 * The one item added between `before` and `after`, with its field and place.
 * Null when nothing was added, or more than one (a paste, another document
 * loaded): following any one of those would be a guess.
 */
export function addedItem(
	before: ItemKeys,
	after: ItemKeys
): { field: string; index: number } | null {
	let found: { field: string; index: number } | null = null;
	for (const [field, keys] of Object.entries(after)) {
		const had = new Set(before[field] ?? []);
		for (const [index, key] of keys.entries()) {
			if (!key || had.has(key)) continue;
			if (found) return null;
			found = { field, index };
		}
	}
	return found;
}
