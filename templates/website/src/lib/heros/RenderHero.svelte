<script lang="ts">
	/**
	 * Dispatches a page's `hero` object to one of four treatments.
	 *
	 * The same authored content — some rich text, up to two links, an image —
	 * renders very differently depending on `variant`. Keeping the switch here
	 * rather than inside one big component means each treatment is a small file
	 * you can read in one go, and adding a fifth is a new file plus one arm.
	 */
	import HighImpact from './HighImpact.svelte';
	import MediumImpact from './MediumImpact.svelte';
	import LowImpact from './LowImpact.svelte';
	import { control } from '$lib/utils/stega';
	import type { HeroValue } from './types';

	let { hero }: { hero: HeroValue | null | undefined } = $props();

	// `control()` matters here more than anywhere: in preview this string carries
	// click-to-edit markers, so an un-cleaned `variant` matches none of the arms
	// below and the hero silently renders as low-impact in the one place an editor
	// is looking. See $lib/utils/stega.ts.
	//
	// `lowImpact` is the schema's initial value, so an unset hero on an older
	// document behaves the same as a new one rather than disappearing.
	const variant = $derived(control(hero?.variant) ?? 'lowImpact');
</script>

{#if hero && variant !== 'none'}
	{#if variant === 'highImpact'}
		<HighImpact {hero} />
	{:else if variant === 'mediumImpact'}
		<MediumImpact {hero} />
	{:else}
		<LowImpact {hero} />
	{/if}
{/if}
