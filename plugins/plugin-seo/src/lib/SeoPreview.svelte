<script lang="ts">
	import type { FieldComponentProps } from '@aphexcms/cms-core';
	import { seoGenerators } from './config';

	// UI-only widget: ignores its own value, renders a live Google-style snippet from
	// the document's data + the plugin's configured generators.
	let { documentData, schemaType }: FieldComponentProps = $props();

	const doc = $derived((documentData ?? {}) as Record<string, any>);
	const seo = $derived((doc.seo ?? {}) as Record<string, any>);
	const gen = seoGenerators();
	// No schema object here (field widgets only get the type name), so the generators
	// fall back to conventional fields — enough for the preview. typeName lets a
	// per-type generateURL pick the right route.
	const ctx = $derived({ typeName: schemaType });

	const title = $derived(seo.metaTitle || gen.generateTitle(doc, ctx) || 'Untitled');
	const description = $derived(seo.metaDescription || gen.generateDescription(doc, ctx) || '');
	const url = $derived(gen.generateURL(doc, ctx));
	const displayUrl = $derived(url.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'example.com');
</script>

<div class="border-border bg-card rounded-lg border p-4">
	<div class="text-[11px] leading-none text-emerald-700 dark:text-emerald-500">
		{displayUrl}
	</div>
	<div class="mt-1 truncate text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
		{title}
	</div>
	<p class="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-snug">
		{description || 'Add a meta description, or one is generated from the excerpt.'}
	</p>
	{#if seo.noIndex}
		<div class="text-destructive mt-2 text-[11px] font-medium">Hidden from search engines</div>
	{/if}
</div>
