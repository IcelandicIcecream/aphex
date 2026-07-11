<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Sparkles } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { DocumentActionProps } from '@aphexcms/cms-core';
	import { seoGenerators } from './config';

	// Every document-action component receives exactly this stable context —
	// nothing from the editor's internals.
	let { action }: { action: DocumentActionProps } = $props();

	let busy = $state(false);

	async function generate() {
		if (busy) return;
		busy = true;
		try {
			const data = action.data as Record<string, any>;
			const existing = (data.seo as Record<string, unknown> | undefined) ?? {};
			const gen = seoGenerators();

			// Derive meta from the plugin's configured generators. The defaults read
			// each type's own `preview` config, so this works across collections
			// (blog→title/excerpt, author→name/bio, …); override via seoPlugin({ … }).
			const ctx = { schema: action.schema, typeName: action.schema.name };
			const seo: Record<string, unknown> = {
				...existing,
				metaTitle: gen.generateTitle(data, ctx),
				metaDescription: gen.generateDescription(data, ctx)
			};
			if (gen.generateImage) {
				const img = gen.generateImage(data, ctx);
				if (img) seo.ogImage = img;
			}

			action.updateData({ seo });
			await action.save();
			toast.success('SEO fields generated.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not generate SEO.');
		} finally {
			busy = false;
		}
	}
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={generate}
	disabled={busy}
	class="h-8 w-8 hover:cursor-pointer"
	title="Generate SEO meta"
>
	<Sparkles class="h-4 w-4 {busy ? 'animate-pulse' : ''}" />
</Button>
