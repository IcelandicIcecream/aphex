<script lang="ts">
	/**
	 * A block-level `image` inside Portable Text.
	 *
	 * `<Image>` from `@aphexcms/cms-core/image` does the work: it reads the url,
	 * srcset and intrinsic size that `injectAssetUrls` wrote onto the asset, and
	 * resolves alt as placement → asset → empty. Its own narrow entrypoint, so a
	 * public page importing it doesn't pull in the admin bundle.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { PortableTextImageBlock } from '$lib/generated-types';

	let { portableText }: { portableText: CustomBlockComponentProps<PortableTextImageBlock> } =
		$props();
</script>

<figure>
	<Image value={portableText.value} sizes="(min-width: 44rem) 44rem, 100vw" />
</figure>

<style>
	figure {
		margin: 2em 0;
	}
	figure :global(img) {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
