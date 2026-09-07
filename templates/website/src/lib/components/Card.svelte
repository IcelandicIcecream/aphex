<script lang="ts">
	/**
	 * One card in a list of posts.
	 *
	 * Deliberately dumb — it takes finished strings and an image, not a document.
	 * The archive page, the archive block and the related-posts strip all feed it
	 * from differently-shaped data (a full post, a resolved reference), and
	 * normalising at each call site beats teaching the card about both.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import type { ImageValue } from '@aphexcms/cms-core/image';

	interface Props {
		href: string | null;
		title: string;
		excerpt?: string | null;
		image?: ImageValue | null;
		/** Category names, shown above the title. */
		tags?: string[];
	}

	let { href, title, excerpt, image, tags = [] }: Props = $props();
</script>

<article
	class="group bg-card hover:border-foreground/25 flex h-full flex-col overflow-hidden rounded-lg border transition-colors"
>
	{#if image?.asset?.url}
		<div class="bg-muted aspect-[16/9] overflow-hidden">
			<Image
				value={image}
				alt=""
				sizes="(min-width: 64rem) 24rem, (min-width: 40rem) 50vw, 100vw"
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
			/>
		</div>
	{/if}

	<div class="flex flex-1 flex-col gap-2 p-5">
		{#if tags.length}
			<p class="text-muted-foreground text-xs tracking-wide uppercase">
				{tags.join(', ')}
			</p>
		{/if}

		<h3 class="text-lg leading-snug font-semibold tracking-tight">
			{#if href}
				<!--
					The whole card is the hit area: the anchor covers it via an
					`::after` overlay, so the markup keeps one real link (good for
					screen readers and for the URL preview) without nesting anything
					clickable inside it.
				-->
				<a {href} class="after:absolute after:inset-0">{title}</a>
			{:else}
				{title}
			{/if}
		</h3>

		{#if excerpt}
			<p class="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{excerpt}</p>
		{/if}
	</div>
</article>

<style>
	article {
		position: relative;
	}
</style>
