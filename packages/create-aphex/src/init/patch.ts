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

const LOCALS_FIELDS = ['aphexCMS: CMSInstances;', 'aphexAuth?: Auth;'];
const APP_DTS_IMPORTS = [
	"import type { CMSInstances, Auth } from '@aphexcms/cms-core/server';",
	"import '@aphexcms/cms-core/app-augment';"
];

/** Adds Aphex's `locals` to `App.Locals`. */
export function patchAppDts(source: string): PatchResult {
	if (source.includes('@aphexcms/cms-core/app-augment')) return { kind: 'unchanged' };

	const instructions = [
		...APP_DTS_IMPORTS,
		'',
		'Inside declare global { namespace App { interface Locals { … } } }:',
		...LOCALS_FIELDS.map((field) => `\t${field}`)
	].join('\n');

	// Adding an import turns a script into a module, and in a module `namespace App`
	// only augments the global one from inside `declare global`.
	if (!/declare\s+global\s*\{/.test(source)) return { kind: 'manual', instructions };

	let body: string;
	const locals = source.match(/^([ \t]*)interface\s+Locals\s*\{[ \t]*(\}?)/m);
	const commented = source.match(/^([ \t]*)\/\/\s*interface\s+Locals\s*\{\s*\}[ \t]*$/m);
	const namespace = source.match(/^([ \t]*)namespace\s+App\s*\{[ \t]*$/m);

	if (locals) {
		const indent = `${locals[1]}\t`;
		const fields = LOCALS_FIELDS.map((field) => `${indent}${field}`).join('\n');
		// `interface Locals {}` on one line gets opened up.
		const replacement = locals[2]
			? `${locals[1]}interface Locals {\n${fields}\n${locals[1]}}`
			: `${locals[1]}interface Locals {\n${fields}`;
		body = source.replace(locals[0], replacement);
	} else if (commented) {
		const indent = commented[1];
		const fields = LOCALS_FIELDS.map((field) => `${indent}\t${field}`).join('\n');
		body = source.replace(commented[0], `${indent}interface Locals {\n${fields}\n${indent}}`);
	} else if (namespace) {
		const indent = `${namespace[1]}\t`;
		const fields = LOCALS_FIELDS.map((field) => `${indent}\t${field}`).join('\n');
		body = source.replace(
			namespace[0],
			`${namespace[0]}\n${indent}interface Locals {\n${fields}\n${indent}}`
		);
	} else {
		return { kind: 'manual', instructions };
	}

	return { kind: 'patched', code: `${APP_DTS_IMPORTS.join('\n')}\n${body}` };
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
