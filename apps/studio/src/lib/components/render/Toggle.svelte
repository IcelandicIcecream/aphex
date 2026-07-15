<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'toggle';
			heading?: string;
			content?: string;
		}>;
	}

	let { portableText }: Props = $props();

	// Native <details>/<summary>: keyboard-accessible and works with JS disabled, so the
	// content stays readable (and indexable) even before hydration.
	const heading = $derived(portableText.value.heading ?? '');
	const content = $derived(portableText.value.content ?? '');
</script>

<details class="toggle">
	<summary class="toggle__summary">
		<span>{heading}</span>
		<svg class="toggle__chevron" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" />
		</svg>
	</summary>
	<div class="toggle__content">{content}</div>
</details>

<style>
	.toggle {
		margin: 1.75rem 0;
		border: 1px solid var(--rule);
		border-radius: 12px;
		background: var(--paper-raised);
		overflow: hidden;
	}
	.toggle__summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.3rem;
		cursor: pointer;
		font-weight: 600;
		color: var(--ink);
		list-style: none;
	}
	/* Hide the default disclosure triangle (we render our own chevron). */
	.toggle__summary::-webkit-details-marker {
		display: none;
	}
	.toggle__summary:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.toggle__chevron {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		transition: transform 150ms ease;
		color: var(--accent);
	}
	.toggle[open] .toggle__chevron {
		transform: rotate(180deg);
	}
	.toggle__content {
		padding: 0 1.3rem 1.2rem;
		font-size: 1.02rem;
		line-height: 1.6;
		white-space: pre-wrap;
		color: color-mix(in srgb, var(--ink) 85%, var(--paper));
	}
	@media (prefers-reduced-motion: reduce) {
		.toggle__chevron {
			transition: none;
		}
	}
</style>
