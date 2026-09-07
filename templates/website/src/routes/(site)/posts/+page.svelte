<script lang="ts">
	import PostArchive from '$lib/components/PostArchive.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<PostArchive
	cards={data.cards}
	page={data.page}
	totalPages={data.totalPages}
	total={data.total}
	limit={data.limit}
	category={data.category}
	truncated={data.truncated}
	siteName={data.settings?.title || 'Aphex'}
/>
