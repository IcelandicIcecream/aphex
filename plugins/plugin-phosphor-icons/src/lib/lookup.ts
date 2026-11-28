/**
 * Icon data, loaded on demand: one module per weight (about 200 KB compressed) and
 * a catalog of names and search words. Nothing here loads until it's asked for, so
 * importing the plugin costs a site nothing.
 */
import { isIconWeight, type IconWeight } from './constants.js';
import type { IconValue } from './value.js';

type Paths = Record<string, string>;
type Duotone = Record<string, [string, string]>;

const loaders = {
	regular: () => import('./data/regular.js'),
	bold: () => import('./data/bold.js'),
	fill: () => import('./data/fill.js'),
	light: () => import('./data/light.js'),
	thin: () => import('./data/thin.js')
} satisfies Record<Exclude<IconWeight, 'duotone'>, () => Promise<{ default: Paths }>>;

const cache = new Map<IconWeight, Promise<Paths | Duotone>>();

function weightData(weight: IconWeight): Promise<Paths | Duotone> {
	let data = cache.get(weight);
	if (!data) {
		data =
			weight === 'duotone'
				? import('./data/duotone.js').then((module) => module.default)
				: loaders[weight]().then((module) => module.default);
		cache.set(weight, data);
	}
	return data;
}

/** The drawing for a name in a weight, or null when Phosphor has no such icon. */
export async function iconPaths(
	name: string,
	weight: IconWeight = 'regular'
): Promise<{ path: string; shade?: string } | null> {
	const data = await weightData(weight);
	const entry = data[name];
	if (entry === undefined) return null;
	return typeof entry === 'string' ? { path: entry } : { path: entry[0], shade: entry[1] };
}

/**
 * Every icon's drawing in one weight, for the picker's grid. Two-tone entries are
 * `[path, shade]`.
 */
export function allIcons(weight: IconWeight): Promise<Paths | Duotone> {
	return weightData(weight);
}

/**
 * A stored or written value with its drawing filled in from its name and weight,
 * or null when the name isn't a Phosphor icon. The drawing always follows the
 * name, so a value can't claim one icon and draw another.
 */
export async function resolveIcon(value: IconValue): Promise<IconValue | null> {
	const name = value.name.trim().toLowerCase();
	const weight = isIconWeight(value.weight) ? value.weight : 'regular';
	const drawing = await iconPaths(name, weight);
	if (!drawing) return null;
	return drawing.shade
		? { name, weight, path: drawing.path, shade: drawing.shade }
		: { name, weight, path: drawing.path };
}

let catalog: Promise<[name: string, words: string][]> | undefined;

/**
 * Icons matching a search, best first: a name that is the query, then names that
 * start with it, then names containing it, then icons whose search words do
 * (`cafe` finds `coffee`). Every word of the query has to match.
 */
export async function searchIcons(query: string, limit = 60): Promise<string[]> {
	catalog ??= import('./data/catalog.js').then((module) => module.default);
	const list = await catalog;
	const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
	if (!words.length) return list.slice(0, limit).map(([name]) => name);
	const joined = words.join('-');
	const scored: [string, number][] = [];
	for (const [name, tags] of list) {
		let score: number;
		if (name === joined) score = 0;
		else if (name.startsWith(joined)) score = 1;
		else if (name.includes(joined)) score = 2;
		else if (words.every((word) => name.includes(word) || tags.includes(word))) score = 3;
		else continue;
		scored.push([name, score]);
	}
	return scored
		.sort((a, b) => a[1] - b[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([name]) => name);
}
