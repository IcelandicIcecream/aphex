<script lang="ts">
	import type { PageData } from './$types';
	import AccountSettings from '../_components/AccountSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - Account</title>
</svelte:head>

<div class="grid gap-6">
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">Profile</h2>
		<p class="text-muted-foreground text-sm">Manage your personal account settings.</p>
	</div>

	<AccountSettings
		user={data.user}
		userPreferences={data.userPreferences}
		hasChildOrganizations={data.hasChildOrganizations}
	/>
</div>
