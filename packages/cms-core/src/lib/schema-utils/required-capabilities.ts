/**
 * `requiredCapabilities` on a schema type: whether a caller holding these
 * capabilities has the type at all. One rule for the server, which refuses, and
 * the admin, which leaves the type out, so the two can't disagree about it.
 */

interface Gated {
	requiredCapabilities?: readonly string[];
}

/** True when the caller holds every capability the type requires (or it requires none). */
export function hasRequiredCapabilities(
	schema: Gated | undefined | null,
	capabilities: Iterable<string>
): boolean {
	const required = schema?.requiredCapabilities;
	if (!required || required.length === 0) return true;
	const held = capabilities instanceof Set ? capabilities : new Set(capabilities);
	return required.every((capability) => held.has(capability));
}

/**
 * Throw if a schema requires a capability nothing declares: not core, not a
 * plugin, not `organizationCapabilities.ids`. Such a type could never be held,
 * so it would vanish for everyone with no error anywhere; a typo ('site.shopp')
 * is the usual cause. Run at boot, next to the other schema checks.
 */
export function validateRequiredCapabilities(
	schemas: readonly (Gated & { name: string })[],
	known: Iterable<string>
): void {
	const declared = new Set(known);
	const errors: string[] = [];
	for (const schema of schemas) {
		for (const capability of schema.requiredCapabilities ?? []) {
			if (!declared.has(capability)) {
				errors.push(
					`Schema "${schema.name}" requires the capability "${capability}", which nothing declares. Add it to organizationCapabilities.ids in aphex.config.ts, or fix the spelling.`
				);
			}
		}
	}
	if (errors.length > 0) {
		throw new Error(`Schema validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
	}
}

/**
 * Throw if `mcp.requiredCapabilities` names a capability nothing declares: no one
 * could ever hold it, so `/mcp` would refuse every caller with no hint why.
 */
export function validateMcpRequiredCapabilities(
	required: readonly string[] | undefined,
	known: Iterable<string>
): void {
	const declared = new Set(known);
	const unknown = (required ?? []).filter((capability) => !declared.has(capability));
	if (unknown.length > 0) {
		throw new Error(
			`mcp.requiredCapabilities names ${unknown.map((c) => `"${c}"`).join(', ')}, which nothing declares. Add it to organizationCapabilities.ids in aphex.config.ts, or fix the spelling.`
		);
	}
}

/** The keyed array items of the given types, anywhere in a document's data. */
export interface TypedArrayItem {
	type: string;
	key: string | undefined;
	path: string;
}

/**
 * Every array item whose `_type` is one of `types`, at any depth: page blocks,
 * items nested inside them, custom blocks in rich text. Only array items, since
 * those are what someone inserts; an object field's value comes with the schema.
 */
export function findArrayItemsOfTypes(
	data: unknown,
	types: ReadonlySet<string>,
	path = ''
): TypedArrayItem[] {
	const found: TypedArrayItem[] = [];
	if (types.size === 0 || data === null || typeof data !== 'object') return found;

	if (Array.isArray(data)) {
		data.forEach((item, index) => {
			const itemPath = `${path}[${index}]`;
			if (item && typeof item === 'object' && !Array.isArray(item)) {
				const type = (item as Record<string, unknown>)._type;
				if (typeof type === 'string' && types.has(type)) {
					const key = (item as Record<string, unknown>)._key;
					found.push({ type, key: typeof key === 'string' ? key : undefined, path: itemPath });
				}
			}
			found.push(...findArrayItemsOfTypes(item, types, itemPath));
		});
		return found;
	}

	for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
		if (value && typeof value === 'object') {
			found.push(...findArrayItemsOfTypes(value, types, path ? `${path}.${name}` : name));
		}
	}
	return found;
}
