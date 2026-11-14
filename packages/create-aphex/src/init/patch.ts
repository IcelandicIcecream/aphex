// Edits to files the app already owns. Each returns the new source, `unchanged` when
// Aphex is already there, or `manual` with the lines to add when the file has a shape
// these edits don't recognise. Guessing at someone else's file is worse than asking.
import { generateCode, parseModule } from 'magicast';
import { addVitePlugin } from 'magicast/helpers';

export type PatchResult =
	| { kind: 'patched'; code: string }
	| { kind: 'unchanged' }
	| { kind: 'manual'; instructions: string };

export function patchViteConfig(source: string, addTailwind: boolean): PatchResult {
	const needsAphex = !source.includes('@aphexcms/cms-core/vite');
	const needsTailwind = addTailwind && !source.includes('@tailwindcss/vite');
	if (!needsAphex && !needsTailwind) return { kind: 'unchanged' };

	const manual: PatchResult = {
		kind: 'manual',
		instructions: [
			...(needsTailwind ? ["import tailwindcss from '@tailwindcss/vite';"] : []),
			...(needsAphex ? ["import { aphex } from '@aphexcms/cms-core/vite';"] : []),
			'',
			`Then add ${[needsTailwind && 'tailwindcss()', needsAphex && 'aphex()'].filter(Boolean).join(' and ')} to plugins.`
		].join('\n')
	};

	// Only aphex() missing: add it as text, so the rest of the file isn't reprinted.
	if (needsAphex && !needsTailwind) {
		const inserted = appendToPlugins(source, 'aphex()');
		if (inserted) {
			return {
				kind: 'patched',
				code: `import { aphex } from '@aphexcms/cms-core/vite';\n${inserted}`
			};
		}
	}

	// recast, under magicast, re-indents the lines it reprints at four tabs per level in a
	// tab-indented file. It handles spaces correctly, so tabs become two spaces for the edit
	// and go back afterwards.
	const usesTabs = /^\t/m.test(source);
	const toSpaces = (code: string) => code.replace(/^\t+/gm, (tabs) => '  '.repeat(tabs.length));
	const toTabs = (code: string) =>
		code.replace(/^(?: {2})+/gm, (spaces) => '\t'.repeat(spaces.length / 2));

	try {
		const module = parseModule(usesTabs ? toSpaces(source) : source);
		if (needsTailwind) {
			addVitePlugin(module, { from: '@tailwindcss/vite', constructor: 'tailwindcss' });
		}
		if (needsAphex) {
			addVitePlugin(module, {
				from: '@aphexcms/cms-core/vite',
				imported: 'aphex',
				constructor: 'aphex'
			});
		}
		const generated = generateCode(module, { format: { tabWidth: 2, useTabs: false } }).code;
		const code = usesTabs ? toTabs(generated) : generated;
		// magicast can't see into every shape (a config built by a function, say), and
		// says so by changing nothing.
		if (needsAphex && !code.includes('aphex()')) return manual;
		return { kind: 'patched', code: code.endsWith('\n') ? code : `${code}\n` };
	} catch {
		return manual;
	}
}

/**
 * Adds `entry` as the last element of the first `plugins: [...]` array, keeping the
 * file's own formatting. Undefined when the array can't be found with confidence.
 */
export function appendToPlugins(source: string, entry: string): string | undefined {
	const start = source.match(/\bplugins\s*:\s*\[/);
	if (!start || start.index === undefined) return undefined;
	const open = start.index + start[0].length - 1;
	let depth = 0;
	let quote: string | undefined;
	for (let i = open; i < source.length; i++) {
		const char = source[i];
		if (quote) {
			if (char === '\\') i++;
			else if (char === quote) quote = undefined;
			continue;
		}
		if (char === '"' || char === "'" || char === '`') quote = char;
		else if (char === '/' && source[i + 1] === '/')
			i = source.indexOf('\n', i) === -1 ? source.length : source.indexOf('\n', i);
		else if (char === '/' && source[i + 1] === '*') i = source.indexOf('*/', i) + 1;
		else if (char === '[' || char === '{' || char === '(') depth++;
		else if (char === ']' || char === '}' || char === ')') {
			depth--;
			if (depth === 0) {
				if (char !== ']') return undefined;
				const inner = source.slice(open + 1, i);
				const trimmed = inner.replace(/\s+$/, '');
				if (trimmed.trim() === '') return `${source.slice(0, open + 1)}${entry}${source.slice(i)}`;
				// Multi-line arrays get the entry on its own line, at the last element's indent.
				const multiline = /\n([ \t]*)\S[^\n]*$/.exec(trimmed);
				const comma = trimmed.endsWith(',') ? '' : ',';
				const addition = multiline ? `${comma}\n${multiline[1]}${entry}` : `${comma} ${entry}`;
				return `${source.slice(0, open + 1)}${trimmed}${addition}${inner.slice(trimmed.length)}${source.slice(i)}`;
			}
		}
	}
	return undefined;
}

const HOOK_IMPORTS = [
	"import { createCMSHook } from '@aphexcms/cms-core/server';",
	"import cmsConfig from '../aphex.config';"
];

/** A name for the app's own handle that the file doesn't already use. */
function freeName(source: string): string {
	for (const name of ['appHandle', 'existingHandle', 'userHandle']) {
		if (!new RegExp(`\\b${name}\\b`).test(source)) return name;
	}
	return 'appHandle_';
}

/**
 * Puts Aphex first in `handle`. The app's handle is renamed and kept, then
 * `sequence(createCMSHook(cmsConfig), <it>)` takes its place, which is what the guide
 * tells people to write by hand.
 */
export function patchHooks(source: string): PatchResult {
	if (source.includes('createCMSHook')) return { kind: 'unchanged' };

	const instructions = [
		...HOOK_IMPORTS,
		"import { sequence } from '@sveltejs/kit/hooks';",
		'',
		'export const handle = sequence(createCMSHook(cmsConfig), yourHandle);',
		'',
		'Aphex has to come first, so that your hook can use locals.aphexCMS.'
	].join('\n');

	// `export { handle }` or a re-export: the definition is somewhere this can't follow.
	if (/export\s*\{[^}]*\bhandle\b[^}]*\}/.test(source) || /export\s+let\s+handle\b/.test(source)) {
		return { kind: 'manual', instructions };
	}

	const name = freeName(source);
	let body: string;
	if (/^export\s+const\s+handle\b/m.test(source)) {
		body = source.replace(/^export\s+const\s+handle\b/m, `const ${name}`);
	} else if (/^export\s+(async\s+)?function\s+handle\s*\(/m.test(source)) {
		body = source.replace(/^export\s+(async\s+)?function\s+handle\s*\(/m, (_match, isAsync) => {
			return `${isAsync ?? ''}function ${name}(`;
		});
	} else if (/\bhandle\b/.test(source.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ''))) {
		// Mentions `handle` some way not covered above.
		return { kind: 'manual', instructions };
	} else {
		// No handle yet: other hooks (handleError, init) stay as they are.
		return {
			kind: 'patched',
			code: `${HOOK_IMPORTS.join('\n')}\n${source.trimEnd()}\n\nexport const handle = createCMSHook(cmsConfig);\n`
		};
	}

	const hasSequence =
		/import\s*\{[^}]*\bsequence\b[^}]*\}\s*from\s*['"]@sveltejs\/kit\/hooks['"]/.test(source);
	const imports = [
		...HOOK_IMPORTS,
		...(hasSequence ? [] : ["import { sequence } from '@sveltejs/kit/hooks';"])
	];
	return {
		kind: 'patched',
		code: `${imports.join('\n')}\n${body.trimEnd()}\n\nexport const handle = sequence(createCMSHook(cmsConfig), ${name});\n`
	};
}

const LOCALS_FIELDS = [
	{ key: 'aphexCMS', line: 'aphexCMS: CMSInstances;', type: 'CMSInstances' },
	{ key: 'aphexAuth', line: 'aphexAuth?: Auth;', type: 'Auth' }
];
const AUGMENT_IMPORT = "import '@aphexcms/cms-core/app-augment';";

/** Adds whichever of Aphex's `locals`, and the imports they need, `App.Locals` lacks. */
export function patchAppDts(source: string): PatchResult {
	const fields = LOCALS_FIELDS.filter(({ key }) => !new RegExp(`\\b${key}\\??\\s*:`).test(source));
	const types = fields
		.map(({ type }) => type)
		.filter((type) => !new RegExp(`import\\s+type\\s*\\{[^}]*\\b${type}\\b`).test(source));
	const needsAugment = !source.includes('@aphexcms/cms-core/app-augment');
	if (fields.length === 0 && !needsAugment) return { kind: 'unchanged' };

	const imports = [
		...(types.length > 0
			? [`import type { ${types.join(', ')} } from '@aphexcms/cms-core/server';`]
			: []),
		...(needsAugment ? [AUGMENT_IMPORT] : [])
	];
	const instructions = [
		...imports,
		...(fields.length > 0
			? [
					'',
					'Inside declare global { namespace App { interface Locals { … } } }:',
					...fields.map(({ line }) => `\t${line}`)
				]
			: [])
	].join('\n');

	// Adding an import turns a script into a module, and in a module `namespace App`
	// only augments the global one from inside `declare global`.
	if (!/declare\s+global\s*\{/.test(source)) return { kind: 'manual', instructions };

	let body = source;
	if (fields.length > 0) {
		const locals = source.match(/^([ \t]*)interface\s+Locals\s*\{[ \t]*(\}?)/m);
		const commented = source.match(/^([ \t]*)\/\/\s*interface\s+Locals\s*\{\s*\}[ \t]*$/m);
		const namespace = source.match(/^([ \t]*)namespace\s+App\s*\{[ \t]*$/m);
		const lines = (indent: string) => fields.map(({ line }) => `${indent}${line}`).join('\n');

		if (locals) {
			// `interface Locals {}` on one line gets opened up.
			const replacement = locals[2]
				? `${locals[1]}interface Locals {\n${lines(`${locals[1]}\t`)}\n${locals[1]}}`
				: `${locals[1]}interface Locals {\n${lines(`${locals[1]}\t`)}`;
			body = source.replace(locals[0], replacement);
		} else if (commented) {
			const indent = commented[1];
			body = source.replace(
				commented[0],
				`${indent}interface Locals {\n${lines(`${indent}\t`)}\n${indent}}`
			);
		} else if (namespace) {
			const indent = `${namespace[1]}\t`;
			body = source.replace(
				namespace[0],
				`${namespace[0]}\n${indent}interface Locals {\n${lines(`${indent}\t`)}\n${indent}}`
			);
		} else {
			return { kind: 'manual', instructions };
		}
	}

	return { kind: 'patched', code: imports.length > 0 ? `${imports.join('\n')}\n${body}` : body };
}

/** Appends missing lines, leaving everything already there alone. */
export function appendMissingLines(source: string, lines: string[], heading: string): PatchResult {
	const existing = new Set(source.split(/\r?\n/).map((line) => line.trim()));
	const missing = lines.filter((line) => !existing.has(line));
	if (missing.length === 0) return { kind: 'unchanged' };
	const separator =
		source === '' || source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n';
	return { kind: 'patched', code: `${source}${separator}# ${heading}\n${missing.join('\n')}\n` };
}

/** Adds the `.env` keys the app doesn't set yet, never changing a value that's there. */
export function patchEnv(source: string, entries: Array<[string, string]>): PatchResult {
	const keys = new Set(
		source
			.split(/\r?\n/)
			.map((line) => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
			.filter((key): key is string => Boolean(key))
	);
	const missing = entries
		.filter(([key]) => !keys.has(key))
		.map(([key, value]) => `${key}=${value}`);
	if (missing.length === 0) return { kind: 'unchanged' };
	return appendMissingLines(source, missing, 'Aphex');
}
