<script lang="ts">
	/**
	 * The `banner` block — a toned aside inside a post.
	 *
	 * The tone classes are written out in full rather than interpolated
	 * (`bg-${style}-50`), because Tailwind scans source text for complete class
	 * names: a constructed one is never emitted and the banner would render
	 * unstyled in a production build.
	 */
	import { control } from '$lib/utils/stega';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	type BannerValue = { style?: string; content?: string };

	let { portableText }: { portableText: CustomBlockComponentProps<BannerValue> } = $props();

	const value = $derived(portableText.value);

	const tones: Record<string, string> = {
		info: 'border-border bg-muted text-foreground',
		success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
		warning: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
		error: 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-100'
	};

	const tone = $derived(tones[control(value?.style) ?? 'info'] ?? tones.info);
</script>

{#if value?.content}
	<aside class="my-8 rounded-lg border px-5 py-4 text-[0.95rem] leading-relaxed {tone}">
		{value.content}
	</aside>
{/if}
