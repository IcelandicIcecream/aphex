/**
 * Emit theme tokens as a scoped `<style>` body.
 *
 * Two hard rules, both learned the expensive way:
 *  1. NEVER emit site tokens at `:root` — they'd bleed into the admin chrome.
 *     Always scope to the site shell selector.
 *  2. Theme values are user-authored, so sanitize before interpolating. Any value
 *     that could break out of the `--var: value;` declaration (contains `;`, `{`,
 *     `}`, `<`, `>`, or a CSS `url(`/`expression(`) is dropped, and the token's
 *     CSS fallback in the layout applies instead.
 */

const UNSAFE = /[;{}<>]|url\s*\(|expression\s*\(/i;

/** Return the value if safe to interpolate into a CSS declaration, else null. */
export function sanitizeTokenValue(value: string): string | null {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	if (UNSAFE.test(trimmed)) return null;
	return trimmed;
}

/**
 * Build a sanitized `--var: value; …` declaration list from a `cssVar → value`
 * map (see deriveThemeVars). Suitable for an inline `style` attribute on the site
 * shell element — the simplest way to scope tokens to the site subtree while
 * beating component-CSS specificity, with no `<style>` injection to guard. Returns
 * `''` when nothing survives sanitization.
 */
export function emitThemeVars(vars: Record<string, string>): string {
	const declarations: string[] = [];

	for (const [cssVar, rawValue] of Object.entries(vars)) {
		if (!cssVar.startsWith('--')) continue;
		const value = sanitizeTokenValue(rawValue);
		if (value === null) continue;
		declarations.push(`${cssVar}: ${value};`);
	}

	return declarations.join(' ');
}

/**
 * Build a scoped style *rule* from a `cssVar → value` map, for callers that
 * prefer injecting a `<style>` block over an inline attribute. Returns `''` when
 * nothing survives sanitization, so callers can skip rendering an empty `<style>`.
 *
 * @param selector CSS selector to scope the custom properties to, e.g. `.blog-shell`.
 */
export function emitThemeStyle(selector: string, vars: Record<string, string>): string {
	const body = emitThemeVars(vars);
	if (body === '') return '';
	return `${selector} { ${body} }`;
}
