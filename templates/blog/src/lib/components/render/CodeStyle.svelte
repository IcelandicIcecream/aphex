<script lang="ts">
	import type { BlockComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: BlockComponentProps;
		children: Snippet;
	}

	// `portableText` is part of the @portabletext/svelte block-component contract but
	// this renderer only needs the slotted children.
	// eslint-disable-next-line svelte/no-unused-props
	let { children }: Props = $props();
</script>

<pre class="codestyle"><code>{@render children()}</code></pre>

<style>
	.codestyle {
		margin: 2.5rem 0;
		width: var(--bleed-width, 100vw);
		max-width: 52rem;
		margin-left: 50%;
		transform: translateX(-50%);
		padding: 1.4rem 1.5rem;
		overflow-x: auto;
		border-radius: 12px;
		background: #16140f;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 24px 50px -28px rgba(0, 0, 0, 0.5);
		font-size: 0.9rem;
		line-height: 1.7;
		color: #e9e3d4;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	@media (max-width: 640px) {
		.codestyle {
			width: 100%;
			margin-left: 0;
			transform: none;
			border-radius: 9px;
		}
	}
</style>
