<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	/**
	 * Public video playback.
	 *
	 * `asset.url` is populated by `injectAssetUrls` server-side — the same generic
	 * `{ asset: { _ref } }` walk that resolves images — so this component builds no
	 * URLs of its own and breaks loudly if the pipeline does.
	 */
	type FileRef = { _ref?: string; url?: string };

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'videoBlock';
			file?: { asset?: FileRef };
			poster?: { asset?: { _ref?: string; url?: string } };
			caption?: string;
			autoplay?: boolean;
			loop?: boolean;
			muted?: boolean;
		}>;
	}

	let { portableText }: Props = $props();

	const value = $derived(portableText.value);
	const src = $derived(value.file?.asset?.url);
	const poster = $derived(value.poster?.asset?.url);

	// Autoplay without muted is silently refused by every browser, so honouring the
	// flag literally would produce a video that never starts and no clue why.
	const muted = $derived(value.muted || value.autoplay);
</script>

{#if src}
	<figure class="video-block">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			{src}
			{poster}
			controls
			playsinline
			muted={muted || undefined}
			autoplay={value.autoplay || undefined}
			loop={value.loop || undefined}
			preload={poster ? 'none' : 'metadata'}
		></video>
		{#if value.caption}
			<figcaption>{value.caption}</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.video-block {
		margin: 2rem 0;
	}
	.video-block video {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		background: #000;
	}
	figcaption {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		opacity: 0.7;
	}
</style>
