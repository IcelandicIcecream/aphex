<script lang="ts">
	import type { PageData } from './$types';
	import ApiKeysSettings from '../_components/ApiKeysSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - API Keys</title>
</svelte:head>

<div class="grid gap-6">
	<ApiKeysSettings apiKeys={data.apiKeys} organizationRole={data.user.organizationRole} />
</div>
