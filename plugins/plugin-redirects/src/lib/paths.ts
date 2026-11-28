// What a redirect's addresses may be, and where one sends a path. Pure and
// client-safe: the Redirects screen checks what's typed with the same rules the
// server keeps (./store.ts). Also `@aphexcms/plugin-redirects/paths`.

/**
 * The longest address a redirect may start from. Each is stored under a collection
 * named after it (`r:/about-us`), so a lookup is one index read, and a collection
 * name is at most 200 characters.
 */
export const MAX_PATH_LENGTH = 190;

export interface RedirectRule {
	fromPath: string;
	toPath: string;
	/** Everything under `fromPath` too: `/blog/x` → `/news/x`. */
	prefix: boolean;
}

/**
 * A site path as redirects store and compare it: from a path or a whole URL
 * (`https://old-site.com/about-us/` → `/about-us`), without the query, fragment or
 * a trailing slash. Null when it isn't one.
 */
export function normalizePath(input: string): string | null {
	let value = input.trim();
	if (value === '') return null;
	if (/^https?:\/\//i.test(value)) {
		try {
			value = new URL(value).pathname;
		} catch {
			return null;
		}
	}
	value = value.replace(/[?#].*$/, '');
	if (!value.startsWith('/')) value = `/${value}`;
	if (value.startsWith('//') || /\s/.test(value)) return null;
	value = value.replace(/\/+$/, '');
	if (value.length > MAX_PATH_LENGTH) return null;
	return value === '' ? '/' : value;
}

/**
 * Where a redirect's target may be: a path on the site, or an address elsewhere
 * (a moved shop, a booking page). Null when it isn't one.
 */
export function normalizeTarget(input: string): string | null {
	const value = input.trim();
	if (/^https?:\/\//i.test(value)) {
		try {
			return new URL(value).toString();
		} catch {
			return null;
		}
	}
	return normalizePath(value);
}

/** Whether `rule` covers `path`. */
export function covers(rule: RedirectRule, path: string): boolean {
	if (rule.fromPath === path) return true;
	return rule.prefix && (rule.fromPath === '/' || path.startsWith(`${rule.fromPath}/`));
}

/**
 * The rule `path` takes and where it goes: the rule for exactly it first, then the
 * longest prefix that covers it, which keeps the rest of the path (`/blog/x` →
 * `/news/x`).
 */
export function matchRedirect<T extends RedirectRule>(
	rules: readonly T[],
	path: string
): { rule: T; target: string } | null {
	const exact = rules.find((rule) => rule.fromPath === path);
	if (exact) return { rule: exact, target: exact.toPath };
	const rule = rules
		.filter((entry) => entry.prefix && covers(entry, path))
		.sort((a, b) => b.fromPath.length - a.fromPath.length)[0];
	if (!rule) return null;
	const rest = rule.fromPath === '/' ? path : path.slice(rule.fromPath.length);
	return { rule, target: `${rule.toPath.replace(/\/$/, '')}${rest}` || '/' };
}

/**
 * `path` and each address above it, nearest first: `/blog/a` → `/blog/a`, `/blog`,
 * `/`. The prefix redirects that could cover it.
 */
export function ancestors(path: string): string[] {
	const out: string[] = [];
	let at = path;
	while (at !== '/' && at !== '') {
		out.push(at);
		at = at.slice(0, at.lastIndexOf('/')) || '/';
	}
	out.push('/');
	return out;
}
