// An app's own admin layout often gave `<Sidebar>` links of its own. Core draws the
// sidebar now and takes those links from `sidebar` in aphex.client.ts, so when that
// layout is deleted its links move there. Only links written out in full move: one
// that reads load data (`data.bookingUrl`) has nothing to read in aphex.client.ts.

import type { PatchResult } from '../init/patch.js';

/** The `SidebarData` fields `AphexClientConfig.sidebar` takes, in the order core draws them. */
const TIERS = ['navGroups', 'navItems', 'systemNavItems', 'secondaryNavItems'] as const;
type Tier = (typeof TIERS)[number];

export interface SidebarLinks {
	tiers: Array<{ tier: Tier; items: string[] }>;
	/** Module → the names to import from it, as written in the layout (`X as Y` included). */
	imports: Map<string, string[]>;
	/** Links left behind, because they need something only the layout had. */
	skipped: Array<{ tier: Tier; text: string }>;
}

const LITERALS = new Set(['true', 'false', 'null', 'undefined']);

/** The source with comments blanked out and every string, template or not, kept as is. */
function withoutComments(source: string): string {
	let out = '';
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (char === '"' || char === "'" || char === '`') {
			const end = stringEnd(source, i);
			out += source.slice(i, end);
			i = end - 1;
		} else if (char === '/' && source[i + 1] === '/') {
			while (i < source.length && source[i] !== '\n') i++;
			out += '\n';
		} else if (char === '/' && source[i + 1] === '*') {
			const end = source.indexOf('*/', i + 2);
			i = end === -1 ? source.length : end + 1;
		} else out += char;
	}
	return out;
}

/** Index just past the string that opens at `start`. */
function stringEnd(source: string, start: number): number {
	const quote = source[start];
	for (let i = start + 1; i < source.length; i++) {
		if (source[i] === '\\') i++;
		else if (source[i] === quote) return i + 1;
	}
	return source.length;
}

/** Index of the bracket that closes the one at `open`, skipping strings. */
function closingBracket(source: string, open: number): number {
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		const char = source[i];
		if (char === '"' || char === "'" || char === '`') i = stringEnd(source, i) - 1;
		else if (char === '[' || char === '{' || char === '(') depth++;
		else if (char === ']' || char === '}' || char === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/** The elements of an array literal's inside, split at its own commas. */
function elements(inside: string): string[] {
	const found: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < inside.length; i++) {
		const char = inside[i];
		if (char === '"' || char === "'" || char === '`') i = stringEnd(inside, i) - 1;
		else if (char === '[' || char === '{' || char === '(') depth++;
		else if (char === ']' || char === '}' || char === ')') depth--;
		else if (char === ',' && depth === 0) {
			found.push(inside.slice(start, i));
			start = i + 1;
		}
	}
	found.push(inside.slice(start));
	return found.map((element) => element.trim()).filter(Boolean);
}

/** Names the element reads: everything but keys, literals and what's inside strings. */
function readsNames(element: string): string[] {
	let bare = '';
	for (let i = 0; i < element.length; i++) {
		const char = element[i];
		if (char === '"' || char === "'" || char === '`') {
			const end = stringEnd(element, i);
			// A template with a placeholder reads whatever the placeholder does.
			if (char === '`' && element.slice(i, end).includes('${')) bare += ' ${} ';
			else bare += ' "" ';
			i = end - 1;
		} else bare += char;
	}
	const names: string[] = [];
	for (const match of bare.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*(?![\w$])(?!\s*:)/g)) {
		if (!LITERALS.has(match[0])) names.push(match[0]);
	}
	if (bare.includes('${}')) names.push('${}');
	return names;
}

/** Local name → `{ module, specifier }` for the imports a link can take along. */
function importsOf(source: string): Map<string, { module: string; specifier: string }> {
	const found = new Map<string, { module: string; specifier: string }>();
	for (const match of source.matchAll(/import\s+(?!type\b)([^;]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
		const [, clause, module] = match;
		// A relative path means something else from aphex.client.ts, so it doesn't count.
		if (module.startsWith('.')) continue;
		const named = /\{([^}]*)\}/.exec(clause);
		for (const specifier of (named?.[1] ?? '').split(',').map((part) => part.trim())) {
			if (!specifier || specifier.startsWith('type ')) continue;
			const local = specifier.split(/\s+as\s+/).pop() ?? specifier;
			found.set(local, { module, specifier });
		}
	}
	return found;
}

/** The link tiers a layout gives `<Sidebar>`, or `undefined` when it gives none. */
export function sidebarLinksIn(layout: string): SidebarLinks | undefined {
	const source = withoutComments(layout);
	const available = importsOf(source);
	const links: SidebarLinks = { tiers: [], imports: new Map(), skipped: [] };
	let any = false;

	for (const tier of TIERS) {
		const key = new RegExp(`(?<![\\w$.])${tier}\\s*:\\s*`).exec(source);
		if (!key) continue;
		any = true;
		const open = key.index + key[0].length;
		const close = source[open] === '[' ? closingBracket(source, open) : -1;
		if (close === -1) {
			// Built in code (`navItems: links`), so there's no list to copy.
			const end = source.slice(open).search(/[,\n}]/);
			links.skipped.push({ tier, text: source.slice(open, open + end).trim() });
			continue;
		}
		const items: string[] = [];
		for (const element of elements(source.slice(open + 1, close))) {
			const text = element.replace(/\s*\n\s*/g, ' ');
			const names = readsNames(element);
			if (!names.every((name) => available.has(name))) {
				links.skipped.push({ tier, text });
				continue;
			}
			items.push(text);
			for (const name of names) {
				const { module, specifier } = available.get(name) ?? { module: '', specifier: '' };
				const list = links.imports.get(module) ?? [];
				if (!list.includes(specifier)) list.push(specifier);
				links.imports.set(module, list);
			}
		}
		// An empty tier would replace core's default links with none.
		if (items.length > 0) links.tiers.push({ tier, items });
	}
	return any ? links : undefined;
}

/** The `sidebar` property for aphex.client.ts, indented one level inside the object. */
export function sidebarProperty(links: SidebarLinks): string {
	const tiers = links.tiers.map(
		({ tier, items }) =>
			`\t\t${tier}: [\n${items.map((item) => `\t\t\t${item}`).join(',\n')}\n\t\t]`
	);
	return `\tsidebar: {\n${tiers.join(',\n')}\n\t}`;
}

/** Import lines for the names the links use. */
export function sidebarImports(links: SidebarLinks): string {
	return [...links.imports]
		.map(([module, names]) => `import { ${names.join(', ')} } from '${module}';\n`)
		.join('');
}

/** Adds the links to an aphex.client.ts that has no `sidebar` yet. */
export function addSidebarLinks(source: string, links: SidebarLinks): PatchResult {
	if (links.tiers.length === 0) return { kind: 'unchanged' };
	if (/(?<![\w$.])sidebar\s*:/.test(source)) {
		return {
			kind: 'manual',
			instructions: `It already sets sidebar, so add the links from your old admin layout to it:\n${sidebarProperty(links)}`
		};
	}
	const end = source.lastIndexOf('\n};');
	if (end === -1) {
		return {
			kind: 'manual',
			instructions: `Add the links from your old admin layout to the config object:\n${sidebarProperty(links)}`
		};
	}
	const body = source.slice(0, end).replace(/,?\s*$/, ',');
	let code = `${body}\n${sidebarProperty(links)}${source.slice(end)}`;

	const missing = new Map<string, string[]>();
	for (const [module, names] of links.imports) {
		const existing = new RegExp(
			`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${module.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"];?`
		).exec(code);
		if (!existing) {
			missing.set(module, names);
			continue;
		}
		const have = existing[1]
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean);
		const add = names.filter((name) => !have.includes(name));
		if (add.length > 0) {
			const merged = `import { ${[...have, ...add].join(', ')} } from '${module}';`;
			code = code.replace(existing[0], merged);
		}
	}
	const lines = sidebarImports({ ...links, imports: missing });
	if (lines) {
		const lastImport = [...code.matchAll(/^import[^;]*;[ \t]*\r?\n/gm)].pop();
		const at = lastImport ? (lastImport.index ?? 0) + lastImport[0].length : 0;
		code = code.slice(0, at) + lines + code.slice(at);
	}
	return { kind: 'patched', code };
}

/** What the person adds by hand: the links that couldn't move. */
export function skippedLinksNote(links: SidebarLinks): string {
	return `These sidebar links read something only your old admin layout had, so add them to\nsidebar in aphex.client.ts yourself, with a fixed value:\n${links.skipped
		.map(({ tier, text }) => `  ${tier}: ${text}`)
		.join('\n')}`;
}
