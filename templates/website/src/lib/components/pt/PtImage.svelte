<script lang="ts">
	/** A block-level `image` inside rich text. */
	import { Image } from '@aphexcms/cms-core/image';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { ImageValue } from '@aphexcms/cms-core/image';

	let { portableText }: { portableText: CustomBlockComponentProps<ImageValue> } = $props();
</script>

<figure class="my-8">
	<Image
		value={portableText.value}
		sizes="(min-width: 48rem) 48rem, 100vw"
		class="h-auto w-full rounded-lg"
	/>
</figure>
