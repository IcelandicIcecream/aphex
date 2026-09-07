<script lang="ts">
	/**
	 * A post's header — categories, title, excerpt, date, hero image.
	 *
	 * Not one of the page hero variants: a post's header isn't authored, it's
	 * derived from the post's own fields, so there's nothing to switch on.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import { usePreview } from '@aphexcms/visual-editing';
	import type { ImageValue } from '@aphexcms/cms-core/image';
	import { formatDate } from '$lib/utils/date';
	import { docHref } from '$lib/utils/link';
	import { isResolvedRef } from '$lib/utils/reference';
	import { control } from '$lib/utils/stega';

	interface Props {
		title: string;
		excerpt?: string | null;
		heroImage?: ImageValue | null;
		categories?: unknown[];
		publishedAt?: Date | string | null;
	}

	let { title, excerpt, heroImage, categories = [], publishedAt }: Props = $props();

	// See HighImpact for why an image needs these attributes and text doesn't.
	const ve = usePreview();

	const cats = $derived(categories.filter(isResolvedRef));
	const date = $derived(formatDate(publishedAt));
	// Machine-readable, so it must be clean — same reason as `formatDate` itself.
	const isoDate = $derived(date ? new Date(control(publishedAt!)).toISOString() : null);
</script>

<header class="container pt-12 md:pt-20">
	<div class="max-w-3xl">
		{#if cats.length}
			<p class="text-muted-foreground mb-4 flex flex-wrap gap-x-3 text-xs tracking-wide uppercase">
				{#each cats as category (category.id)}
					{@const href = docHref('category', category.slug)}
					{#if href}
						<a {href} class="hover:text-foreground">{category.title}</a>
					{:else}
						<span>{category.title}</span>
					{/if}
				{/each}
			</p>
		{/if}

		<h1 class="text-4xl font-semibold tracking-tight text-balance md:text-5xl">{title}</h1>

		{#if excerpt}
			<p class="text-muted-foreground mt-5 text-lg leading-relaxed">{excerpt}</p>
		{/if}

		{#if date}
			<!-- `datetime` carries the machine-readable value so the visible text is
			     free to be human-readable. -->
			<p class="text-muted-foreground mt-6 text-sm">
				<time datetime={isoDate ?? undefined}>{date}</time>
			</p>
		{/if}
	</div>

	{#if heroImage?.asset?.url}
		<div
			class="bg-muted mt-10 overflow-hidden rounded-xl border"
			{...ve.edit({ field: 'heroImage' })}
		>
			<Image
				value={heroImage}
				sizes="(min-width: 80rem) 76rem, 100vw"
				priority
				class="h-auto w-full"
			/>
		</div>
	{/if}
</header>
