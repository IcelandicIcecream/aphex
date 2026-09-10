#!/usr/bin/env node
/**
 * check-doc-links.mjs — every internal docs link must resolve to a real page and heading.
 *
 * Sibling of check-doc-source-links.mjs, which validates `<Src>` links out to GitHub.
 * This one validates links *within* the docs site: `[text](/configuration#admin-sidebar)`
 * and `<Card href="#recipes">`.
 *
 * Two ways these rot, both silent in a Next build:
 *
 *   1. The wrong prefix. The site is served at the root (`baseUrl: '/'` in
 *      docs/aphex-docs/src/lib/source.ts), so `/docs/plugins` is a 404 — but it reads
 *      as obviously correct, and 33 such links accumulated before anyone noticed.
 *   2. A renamed heading. The page still resolves, so the reader lands at the top of a
 *      long page with no idea which section they were promised.
 *
 * Usage: node scripts/check-doc-links.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DOCS_DIR = join(REPO_ROOT, 'docs/aphex-docs/content/docs');

/** Markdown links and JSX `href` attributes, e.g. `](/foo#bar)` and `href="#bar"`. */
const MD_LINK = /\]\(([^)\s]+)\)/g;
const HREF_ATTR = /\bhref=["']([^"']+)["']/g;
/** Fenced code blocks — a link inside one is illustrative, not navigation. */
const FENCE = /```[\s\S]*?```/g;
const HEADING = /^(#{1,6})\s+(.*)$/gm;

/**
 * github-slugger's algorithm, which is what fumadocs uses to id its headings.
 * Note it replaces each space individually rather than collapsing runs, so
 * `Concurrency — expectedRevision` is `concurrency--expectedrevision`, with two
 * hyphens. Getting that wrong makes a correct link look broken.
 */
function slugify(heading) {
	return heading
		.replace(/`([^`]*)`/g, '$1') // inline code keeps its text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their label
		.replace(/\*\*|\*|_/g, '') // bold / italic markers
		.toLowerCase()
		.replace(/[^\w\s-]/g, '') // punctuation, em dashes, emoji
		.trim()
		.replace(/ /g, '-');
}

function mdxFiles(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...mdxFiles(full));
		else if (entry.endsWith('.mdx')) out.push(full);
	}
	return out;
}

/** File path → the URL the docs site serves it at, given `baseUrl: '/'`. */
function pageSlug(file) {
	const rel = relative(DOCS_DIR, file)
		.replace(/\\/g, '/')
		.replace(/\.mdx$/, '');
	const withoutIndex = rel.replace(/(^|\/)index$/, '');
	return '/' + withoutIndex;
}

// Pass one: every page, and the heading anchors it offers.
const pages = new Map();

for (const file of mdxFiles(DOCS_DIR)) {
	const body = readFileSync(file, 'utf8').replace(FENCE, '');
	const anchors = new Set();
	// A repeated heading gets a `-1`, `-2` suffix, so slugs are assigned in document
	// order rather than collected into a set.
	const seen = new Map();
	for (const [, , text] of body.matchAll(HEADING)) {
		const base = slugify(text);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		anchors.add(count === 0 ? base : `${base}-${count}`);
	}
	pages.set(pageSlug(file).replace(/\/$/, '') || '/', anchors);
}

// Pass two: every internal link.
const problems = [];
let checked = 0;

for (const file of mdxFiles(DOCS_DIR)) {
	const body = readFileSync(file, 'utf8').replace(FENCE, '');
	const where = relative(REPO_ROOT, file);
	const self = pageSlug(file).replace(/\/$/, '') || '/';

	const targets = [...body.matchAll(MD_LINK), ...body.matchAll(HREF_ATTR)].map((m) => m[1]);

	for (const target of targets) {
		// External, mail, and template expressions are not ours to validate.
		if (!target.startsWith('/') && !target.startsWith('#')) continue;
		checked++;

		const [rawPath, anchor] = target.split('#');
		const path = rawPath === '' ? self : rawPath.replace(/\/$/, '') || '/';

		if (!pages.has(path)) {
			problems.push(`${where}: \`${target}\` — no page at \`${path}\``);
			continue;
		}
		if (anchor && !pages.get(path).has(anchor)) {
			problems.push(`${where}: \`${target}\` — \`${path}\` has no heading \`#${anchor}\``);
		}
	}
}

if (problems.length > 0) {
	console.error('✗ broken docs links:\n');
	for (const problem of problems) console.error(`  - ${problem}`);
	console.error(
		'\nThe docs site is served at the root, so an internal link is `/plugins`, never' +
			'\n`/docs/plugins`. For a missing heading, the section was probably renamed —' +
			'\nre-point the link rather than restoring the old title.'
	);
	process.exit(1);
}

console.log(`✓ ${checked} internal docs link(s) resolve to a real page and heading`);
