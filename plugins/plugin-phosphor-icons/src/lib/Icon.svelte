<script lang="ts">
	import { isDrawableIcon } from './value.js';

	/**
	 * Draws a stored icon value. It needs nothing but the value (the drawing is saved
	 * with it), so a site imports this alone and ships no icon set. Coloured by
	 * `currentColor`, sized by its `class` or the surrounding font (1em).
	 *
	 * `label` makes it an image with a name for screen readers; without one it's
	 * decoration, as an icon beside its own words should be.
	 */
	let {
		value,
		class: className = '',
		label
	}: { value: unknown; class?: string; label?: string } = $props();
</script>

{#if isDrawableIcon(value)}
	<svg
		class={className}
		viewBox="0 0 256 256"
		fill="currentColor"
		width="1em"
		height="1em"
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
		focusable="false"
	>
		{#if value.shade}<path d={value.shade} opacity="0.2" />{/if}
		<path d={value.path} />
	</svg>
{/if}
