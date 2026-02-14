<script lang="ts">
	import type { PageData } from './$types';
	import AccountSettings from '../_components/AccountSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - Account</title>
</svelte:head>

<div class="grid gap-6">
	<AccountSettings
		user={data.user}
		userPreferences={data.userPreferences}
		hasChildOrganizations={data.hasChildOrganizations}
	/>
</div>
