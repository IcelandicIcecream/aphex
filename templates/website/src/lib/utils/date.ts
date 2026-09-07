import { control } from './stega';

/**
 * Dates arrive as a `Date` over SvelteKit's devalue transport when they come
 * from `_meta`, and as a string when they come from a JSON column or a
 * hand-built value. Accept both rather than asserting one away.
 *
 * A date is parsed, not displayed, so it goes through `control()` first: in
 * preview the string carries click-to-edit markers and `new Date()` on it
 * returns Invalid Date, which is how a post's date silently disappears in the
 * editor and nowhere else. See $lib/utils/stega.ts.
 */
export function formatDate(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	const date = new Date(control(value));
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}
