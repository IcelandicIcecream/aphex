<script lang="ts">
	/**
	 * Renders one authored link.
	 *
	 * Every link on the site goes through here — nav items, hero buttons, CTA
	 * buttons, the link on a content column — so the rules about what a link does
	 * when it can't resolve live in one place.
	 *
	 * ## Appearance and destination are separate concerns
	 *
	 * A link can have an appearance but no destination, and that is not an error
	 * state — it is the normal condition in the visual editor. `ve.live()` swaps in
	 * the document the editor is holding, whose `reference` fields are still raw
	 * `{ _ref }` markers: reference resolution happens server-side during the page
	 * load, and the live document never went through it. So in preview an internal
	 * link genuinely has no href.
	 *
	 * Degrading that to plain text would mean every button on the page loses its
	 * shape the moment an editor opens preview — which is exactly the view they're
	 * using to judge the design. So a link without a destination keeps its
	 * appearance and simply doesn't navigate.
	 *
	 * `appearance` comes from the schema: `default` and `outline` render as
	 * buttons, anything else as an underlined inline link.
	 */
	import { buttonVariants } from '@aphexcms/ui/shadcn/button';
	import { resolveHref, resolveLabel, type CMSLinkValue } from '$lib/utils/link';
	import { control } from '$lib/utils/stega';

	interface Props {
		link: CMSLinkValue | null | undefined;
		/** Overrides the appearance stored on the link. */
		appearance?: string;
		class?: string;
	}

	let { link, appearance, class: className = '' }: Props = $props();

	const href = $derived(resolveHref(link));
	const label = $derived(resolveLabel(link));
	// The label keeps its stega — that is what makes it click-to-edit. `look` is a
	// branch, so it is cleaned. See $lib/utils/stega.ts.
	const look = $derived(appearance ?? control(link?.appearance) ?? 'link');
	const newTab = $derived(link?.newTab === true);
	// `noopener` is the security-relevant half (it severs `window.opener`);
	// `noreferrer` is the privacy half. Both, or neither.
	const rel = $derived(newTab ? 'noopener noreferrer' : undefined);

	const isButton = $derived(look === 'default' || look === 'outline');
	const buttonClass = $derived(
		buttonVariants({ variant: look === 'outline' ? 'outline' : 'default' }) + ' ' + className
	);
</script>

{#if !label}
	<!-- Nothing to render. An empty array row shouldn't leave a gap. -->
{:else if isButton && href}
	<a {href} target={newTab ? '_blank' : undefined} {rel} class={buttonClass}>
		{label}
	</a>
{:else if isButton}
	<!-- Looks like a button, isn't one: no destination to go to. `aria-disabled`
	     rather than a `<button disabled>` so the label stays readable to a screen
	     reader instead of being announced as an unavailable control. -->
	<span class={buttonClass} aria-disabled="true">{label}</span>
{:else if href}
	<a
		{href}
		target={newTab ? '_blank' : undefined}
		{rel}
		class="underline-offset-4 hover:underline {className}"
	>
		{label}
	</a>
{:else}
	<span class={className}>{label}</span>
{/if}
