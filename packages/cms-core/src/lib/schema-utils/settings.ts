// Helpers for plugin settings declarations (`aphex/settings`).
//
// Shared by the settings panel (which renders the options) and PluginSettingsService
// (which validates a submitted value against them). They must agree: if they drift,
// the panel offers a choice the server rejects. So the normalization lives here once.

import type { SettingsField } from '../types/schemas';

/** A normalized select option: what the user sees, and what gets stored. */
export interface SettingsListItem {
	title: string;
	value: string;
}

/**
 * The select options for a settings field, normalized from `StringField.list`'s
 * loose shape (bare strings, or `{title, value}` objects) — empty when the field
 * isn't a select.
 *
 * A `DependentList` yields no options: its valid values are a function of another
 * field's value, which settings doesn't resolve. The panel renders such a field as a
 * free-text input, so the validator must not treat it as a closed set either.
 */
export function settingsListItems(field: SettingsField): SettingsListItem[] {
	if (field.type !== 'string') return [];
	const list = field.list;
	if (!Array.isArray(list)) return [];
	return list.map((item) => (typeof item === 'string' ? { title: item, value: item } : item));
}
