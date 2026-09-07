import type { InputValue } from '@portabletext/svelte';
import type { ImageValue } from '@aphexcms/cms-core/image';
import type { CardData } from '$lib/utils/card';
import type { ResolvedRef } from '$lib/utils/reference';
import type { CMSLinkValue } from '$lib/utils/link';
import type { FormFieldValue as PluginFormFieldValue } from '@aphexcms/plugin-forms';

/**
 * The layout blocks, as they reach the renderers.
 *
 * A page's `layout` is generated as `unknown[]` — an array whose items are four
 * different shapes has no single generated type — so these declare what each
 * `_type` actually carries. `RenderBlocks` narrows on `_type` and hands the
 * matching component its own interface.
 *
 * `_type` is the discriminant — a literal on each member — so `{#if block._type
 * === 'cta'}` in `RenderBlocks` narrows the union on its own and each component
 * receives its own interface with no cast. Every *other* field is optional: a
 * block authored before a field existed simply won't have it, and the renderers
 * are written to survive that.
 */

interface BaseBlock {
	/** Aphex writes `_key` on every array item; it's the stable identity for keyed each-blocks. */
	_key?: string;
}

export interface CallToActionBlockValue extends BaseBlock {
	_type: 'cta';
	richText?: InputValue;
	links?: CMSLinkValue[];
}

/** One column of a content block. The link fields are inlined, not nested. */
export interface ContentColumn extends CMSLinkValue {
	_key?: string;
	size?: string;
	richText?: InputValue;
	enableLink?: boolean;
}

export interface ContentBlockValue extends BaseBlock {
	_type: 'content';
	columns?: ContentColumn[];
}

export interface MediaBlockValue extends BaseBlock {
	_type: 'mediaBlock';
	media?: ImageValue;
	caption?: string;
}

export interface ArchiveBlockValue extends BaseBlock {
	_type: 'archive';
	introContent?: InputValue;
	populateBy?: string;
	limit?: number;
	categories?: ResolvedRef[];
	selectedDocs?: ResolvedRef[];
	/**
	 * Attached during the page load by `loadArchiveBlocks()`, never authored.
	 * The underscore marks it as derived — it exists in no schema and is never
	 * written back.
	 */
	_posts?: CardData[];
}

/**
 * A form document as the *renderer* sees it.
 *
 * The plugin types its rich-text fields as `unknown`, and correctly so: it has no
 * opinion about how a site renders Portable Text and can't depend on
 * `@portabletext/svelte` to say `InputValue`. The template does know, so it
 * refines them here — the same move `Resolved<T>` makes for references, narrowing
 * at the boundary where more is actually known rather than casting at each use.
 */
export type FormFieldValue = Omit<PluginFormFieldValue, 'message'> & {
	message?: InputValue;
};

/** The deliberately small form shape that may cross the public hydration boundary. */
export interface PublicFormDTO {
	id: string;
	fields: FormFieldValue[];
	submitButtonLabel?: string;
	confirmationType?: 'message' | 'redirect';
	confirmationMessage?: InputValue;
	redirectUrl?: string;
	/** Published-content token echoed on submit so the server can reject stale forms. */
	version: string;
}

export interface FormBlockValue extends BaseBlock {
	_type: 'formBlock';
	introContent?: InputValue;
	/**
	 * Resolved from a `{ _ref }` during the page load, like every other reference
	 * on a page. In preview it arrives unresolved, which is why `FormBlock`
	 * renders an explanatory placeholder rather than assuming fields exist.
	 */
	form?: ResolvedRef;
	/**
	 * The public projection of the referenced form, attached during the page load by
	 * `loadFormBlocks()`. Underscore-prefixed because it is derived, exists in no
	 * schema, and is never written back — same convention as `_posts`.
	 */
	_form?: PublicFormDTO | null;
}

export type LayoutBlock =
	| CallToActionBlockValue
	| ContentBlockValue
	| MediaBlockValue
	| ArchiveBlockValue
	| FormBlockValue;
