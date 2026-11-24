/**
 * Dates as the person reading them writes dates: their order (22/11/2026 or
 * 11/22/2026), their month names, their 12 or 24 hour clock, their time zone.
 *
 * `navigator.languages` is what their browser asks every website for, set from
 * their system's region. `toLocaleDateString(undefined)` uses the browser's own
 * interface language instead, which is often English (US) wherever its owner
 * lives, so an Australian got 11/22/2026. On the server there is no reader, and
 * Intl's default stands.
 */

/** The reader's preferred languages, most preferred first; undefined on the server. */
export function viewerLocales(): readonly string[] | undefined {
	if (typeof navigator === 'undefined') return undefined;
	const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
	return languages.filter(Boolean);
}

/**
 * A date or time in the reader's own format. Pass Intl options for the parts you
 * want (default: "22 Nov 2026"); leave the clock (`hour12`) to them. An empty or
 * unreadable value gives ''.
 */
export function formatDate(
	value: Date | string | number | null | undefined,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
	if (value === null || value === undefined || value === '') return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const locales = viewerLocales();
	try {
		return new Intl.DateTimeFormat(locales ? [...locales] : undefined, options).format(date);
	} catch {
		// A language tag Intl doesn't accept: its own default rather than nothing.
		return new Intl.DateTimeFormat(undefined, options).format(date);
	}
}
