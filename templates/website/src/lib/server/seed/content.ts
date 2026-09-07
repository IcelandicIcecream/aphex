/**
 * Portable Text builders for the seed.
 *
 * Rich text is stored as blocks, and every block and span needs its own `_key`.
 * Writing that out by hand is unreadable at any length, so the seed composes it
 * from these instead — `h2('Title')` beside a literal 40-line block object is
 * the difference between content you can edit and content you skip past.
 *
 * Keys are derived from a counter per call site rather than randomly, so
 * re-running the seed produces identical documents.
 */

import type { PortableTextBlock } from '$lib/generated-types';

/**
 * The block and span shapes are taken from the generated types rather than
 * redeclared, so a change to how Aphex stores Portable Text shows up here as a
 * compile error instead of as content that silently fails to render.
 */
export type Block = PortableTextBlock;
export type Span = PortableTextBlock['children'][number];

let counter = 0;
const key = (prefix: string) => `${prefix}-${(counter++).toString(36)}`;

/** Reset the key counter so a seed run is reproducible. */
export function resetKeys(): void {
	counter = 0;
}

function spans(text: string | Span[]): Span[] {
	if (typeof text !== 'string') return text;
	return [{ _type: 'span', _key: key('s'), text, marks: [] }];
}

/** A styled span, for mixing bold/code into a paragraph. */
export function span(text: string, marks: string[] = []): Span {
	return { _type: 'span', _key: key('s'), text, marks };
}

function block(style: string, text: string | Span[], extra: Partial<Block> = {}): Block {
	return { _type: 'block', _key: key('b'), style, children: spans(text), ...extra };
}

export const p = (text: string | Span[], extra: Partial<Block> = {}) =>
	block('normal', text, extra);
export const h1 = (text: string) => block('h1', text);
export const h2 = (text: string) => block('h2', text);
export const h3 = (text: string) => block('h3', text);
export const quote = (text: string) => block('blockquote', text);
export const bullet = (text: string | Span[]) =>
	block('normal', text, { listItem: 'bullet', level: 1 });

/** A paragraph containing one link. */
export function link(before: string, label: string, href: string, after = ''): Block {
	const markKey = key('link');
	const children: Span[] = [];
	if (before) children.push(span(before));
	children.push(span(label, [markKey]));
	if (after) children.push(span(after));
	return {
		_type: 'block',
		_key: key('b'),
		style: 'normal',
		children,
		markDefs: [{ _key: markKey, _type: 'link', href, blank: true }]
	};
}

/** An image field value, or `undefined` when the upload didn't happen. */
export const image = (id: string | null, alt: string) =>
	id
		? { _type: 'image' as const, asset: { _type: 'reference' as const, _ref: id }, alt }
		: undefined;

/** A reference array item, as stored inside an `array` of `reference`. */
export const ref = (id: string) => ({
	_type: 'reference' as const,
	_key: key('r'),
	_ref: id
});

/** A nav / hero / CTA link pointing at a document. */
export const internalLink = (label: string, docId: string, appearance?: string) => ({
	_type: 'linkItem' as const,
	_key: key('l'),
	linkType: 'reference' as const,
	label,
	reference: { _type: 'reference' as const, _ref: docId },
	...(appearance ? { appearance } : {})
});

/** A nav / hero / CTA link pointing at a URL. */
export const externalLink = (label: string, url: string, appearance?: string) => ({
	_type: 'linkItem' as const,
	_key: key('l'),
	linkType: 'custom' as const,
	label,
	url,
	newTab: /^https?:\/\//.test(url),
	...(appearance ? { appearance } : {})
});
