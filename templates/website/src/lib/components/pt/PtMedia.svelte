<script lang="ts">
	/**
	 * The `mediaBlock` inside rich text — the same block the page builder offers,
	 * so an image with a caption looks identical whether it was placed in a post's
	 * body or as a layout block on a page.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { ImageValue } from '@aphexcms/cms-core/image';

	type MediaValue = { media?: ImageValue; caption?: string };

	let { portableText }: { portableText: CustomBlockComponentProps<MediaValue> } = $props();

	const value = $derived(portableText.value);
</script>

<figure class="my-8">
	<Image
		value={value?.media}
		sizes="(min-width: 48rem) 48rem, 100vw"
		class="h-auto w-full rounded-lg"
	/>
	{#if value?.caption}
		<figcaption class="text-muted-foreground mt-2 text-sm">{value.caption}</figcaption>
	{/if}
</figure>
