import { stegaClean } from '@aphexcms/visual-editing';

/**
 * Strip click-to-edit markers from a value that is used as *logic* rather than
 * displayed as text.
 *
 * ## The problem this solves
 *
 * In preview, the studio pushes a live document whose strings carry stega —
 * invisible Unicode characters encoding "which field is this, click to edit it".
 * That's what makes text on the page clickable, and it is completely harmless
 * for anything rendered into the DOM: the characters are zero-width.
 *
 * It is not harmless for a string the code makes a decision with. A hero whose
 * `variant` is `"highImpact"` plus forty invisible characters does not equal
 * `'highImpact'`, so the switch falls through to the default and the page
 * silently renders as something else — only in preview, which is the one place
 * an editor is looking. The same applies to a URL (invisible characters in an
 * `href` produce a 404), to a block's `_type`, and to any value used as an
 * object key.
 *
 * So: **display values keep their stega, control values get cleaned.** The rule
 * is whether the string ends up as text on the screen or in an `if`.
 *
 * Cleaning is deep, so passing an object cleans every string in it — but prefer
 * cleaning the specific values you branch on, because cleaning a whole document
 * would strip the markers off the text too and quietly disable visual editing
 * for that subtree.
 *
 * Outside preview this is a no-op on values that were never encoded.
 */
export function control<T>(value: T): T {
	return stegaClean(value);
}
