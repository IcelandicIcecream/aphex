<script lang="ts">
	/**
	 * Renders one `page` document: its hero, then its layout blocks, then the
	 * edit affordance.
	 *
	 * Shared by `/` and `/[slug]` — the front page is just the page slugged
	 * `home`, so there's no reason for two renderers.
	 *
	 * `usePreview().live()` swaps in the draft being edited when the studio opens
	 * this URL via the schema's `previewUrl`, and is a passthrough otherwise.
	 */
	import { usePreview } from '@aphexcms/visual-editing';
	import RenderHero from '$lib/heros/RenderHero.svelte';
	import RenderBlocks from '$lib/blocks/RenderBlocks.svelte';
	import Seo from './Seo.svelte';
	import { control } from '$lib/utils/stega';

	interface Props {
		page: Record<string, any>;
		siteName: string;
		signedIn?: boolean;
	}

	let { page: doc, siteName, signedIn = false }: Props = $props();

	const ve = usePreview();
	const page = $derived(ve.live(doc, { type: 'page' }));
	const heroImage = $derived(ve.image(page.hero?.media));
</script>

<Seo seo={page.seo} title={page.title} image={heroImage.src} {siteName} />

<RenderHero hero={page.hero} />
<RenderBlocks blocks={page.layout} />

{#if signedIn}
	<div class="container mt-16">
		<!-- The admin is one route that reads `docType`/`docId` off the query
		     string, so this is the deep link — there is no /admin/<type>/<id>. -->
		<a
			href="/admin?docType=page&docId={control(page.id)}"
			class="text-muted-foreground hover:text-foreground text-sm"
		>
			Edit this page →
		</a>
	</div>
{/if}
