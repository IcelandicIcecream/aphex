/**
 * An organization's name as people typed it, made safe to store and show: one
 * line, no invisible characters, no runs of spaces, one Unicode form.
 *
 * - Line breaks, tabs and other control characters become a space.
 * - Invisible characters are removed: zero-width spaces, word joiners, byte-order
 *   marks, soft hyphens, and the direction overrides that make text read
 *   differently from how it's stored. Zero-width joiners stay, since emoji like
 *   👩\u200D🍳 are made with them.
 * - Runs of spaces become one, and the ends are trimmed.
 *
 * What a name may say (blocked words, a shorter limit) is the app's call:
 * `checkOrganizationName` in the config.
 */
export function cleanOrganizationName(input: string): string {
	return (
		input
			.normalize('NFC')
			// Control characters are what this replaces: matching them is the point.
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ')
			.replace(/[\u00AD\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

/** The longest name the API stores; an app can set a shorter one. */
export const ORGANIZATION_NAME_MAX = 200;
