import type { InputValue } from '@portabletext/svelte';
import type { ImageValue } from '@aphexcms/cms-core/image';
import type { CMSLinkValue } from '$lib/utils/link';

/**
 * A page's `hero` object, as it reaches the components — after
 * `injectAssetUrls` has expanded `media` and `resolveReferences` has expanded
 * any internal links.
 */
export interface HeroValue {
	/** `none` | `highImpact` | `mediumImpact` | `lowImpact`. Named `variant` because `type` is reserved. */
	variant?: string;
	/** `left` | `center`. Not offered for `highImpact`, which is always centred. */
	align?: string;
	richText?: InputValue;
	links?: CMSLinkValue[];
	media?: ImageValue;
}
