<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{ href?: string; blank?: boolean }>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();
</script>

<a
	class="blog-link"
	href={portableText.value?.href ?? '#'}
	target={portableText.value?.blank ? '_blank' : undefined}
	rel={portableText.value?.blank ? 'noopener noreferrer' : undefined}
>
	{@render children()}
</a>

<style>
	.blog-link {
		color: var(--accent-ink);
		text-decoration: none;
		background-image: linear-gradient(var(--accent), var(--accent));
		background-position: 0 100%;
		background-repeat: no-repeat;
		background-size: 100% 1.5px;
		padding-bottom: 1px;
		transition: background-size 0.2s ease;
	}
	.blog-link:hover {
		background-size: 100% 100%;
		color: var(--paper);
		border-radius: 3px;
		box-shadow: 0 0 0 3px var(--accent);
	}
</style>
