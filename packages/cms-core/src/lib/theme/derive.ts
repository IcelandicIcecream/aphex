/**
 * Derive the admin schema and the runtime CSS-var map from a token list.
 *
 * `deriveThemeFields()` feeds the `theme` singleton schema; `deriveThemeVars()`
 * turns a saved theme document into `{ '--accent': '#…', … }`. Both walk the same
 * token list, so the form and the rendered CSS can never drift. The app supplies
 * the tokens (see the app's `theme/tokens.ts`).
 */
import type { Field, FieldGroup } from '../types/schemas';
import type { ThemeToken } from './tokens';

/**
 * Build the field-group list for a theme singleton, one group per distinct
 * `token.group` in first-seen order. The first group is marked `default`.
 */
export function deriveThemeFieldGroups(tokens: ThemeToken[]): FieldGroup[] {
	const seen = new Map<string, FieldGroup>();
	for (const token of tokens) {
		if (seen.has(token.group)) continue;
		seen.set(token.group, {
			name: token.group,
			title: token.group.charAt(0).toUpperCase() + token.group.slice(1),
			default: seen.size === 0
		});
	}
	return [...seen.values()];
}

/** Build the field list for the `theme` singleton schema from the token set. */
export function deriveThemeFields(tokens: ThemeToken[]): Field[] {
	return tokens.map((token): Field => {
		const base = {
			name: token.name,
			title: token.title,
			description: token.description,
			group: token.group
		};
		switch (token.kind) {
			case 'color':
				// Color is a plugin field widget, not a built-in type. Emit a string
				// field wired to the color-picker input; without the plugin installed it
				// degrades to a plain text input (still a valid CSS color string).
				return { ...base, type: 'string', input: 'color', initialValue: token.default };
			case 'range':
				return {
					...base,
					type: 'number',
					min: token.min,
					max: token.max,
					step: token.step,
					initialValue: token.default,
					options: { layout: 'slider', unit: token.unit }
				};
			case 'select':
				return {
					...base,
					type: 'string',
					initialValue: token.default,
					list: token.options.map((o) => ({ title: o.title, value: o.value })),
					options: { layout: 'dropdown' }
				};
			case 'font':
				return {
					...base,
					type: 'string',
					initialValue: token.default,
					list: token.options.map((o) => ({ title: o.title, value: o.value })),
					options: { layout: 'dropdown' }
				};
		}
	});
}

/**
 * Resolve a theme document into a `cssVar → value` map, falling back to each
 * token's default when the document omits or blanks a value. Font values are
 * resolved to their full CSS stack; colors pass through (sanitized in ./css.ts).
 *
 * Accepts `unknown` so callers can pass a concrete generated document type (which
 * lacks a string index signature) without casting; keys are read dynamically.
 */
export function deriveThemeVars(values: unknown, tokens: ThemeToken[]): Record<string, string> {
	const vars: Record<string, string> = {};
	const doc: Record<string, unknown> = {};
	if (values && typeof values === 'object') Object.assign(doc, values);

	for (const token of tokens) {
		const raw = doc[token.name];

		switch (token.kind) {
			case 'color': {
				vars[token.cssVar] =
					typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : token.default;
				break;
			}
			case 'select': {
				const selected = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : token.default;
				const known = token.options.some((o) => o.value === selected);
				vars[token.cssVar] = known ? selected : token.default;
				break;
			}
			case 'range': {
				const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : token.default;
				vars[token.cssVar] = `${n}${token.unit ?? ''}`;
				break;
			}
			case 'font': {
				// Map the stored value to its stack; unknown/blank → default option.
				const selected = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : token.default;
				const option =
					token.options.find((o) => o.value === selected) ??
					token.options.find((o) => o.value === token.default) ??
					token.options[0];
				if (option) vars[token.cssVar] = option.stack;
				break;
			}
		}
	}

	return vars;
}
