<script lang="ts">
	import type { PageData } from './$types';
	import AccountSettings from '../_components/AccountSettings.svelte';
	import PreferencesSettings from '../_components/PreferencesSettings.svelte';
	import PasswordSettings from '../_components/PasswordSettings.svelte';
	import TwoFactorSettings from '../_components/TwoFactorSettings.svelte';
	import DeleteAccountSettings from '../_components/DeleteAccountSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - Account</title>
</svelte:head>

<!--
	Only Security carries a heading. The page's own tab title already says this is
	Profile, so repeating it would label the top section twice and the bottom one
	once — Security earns its heading because it's the break in subject, not
	because every group needs a title.
-->
<div class="grid gap-10">
	<section class="grid gap-4">
		<AccountSettings user={data.user} />
		<PreferencesSettings
			userPreferences={data.userPreferences}
			hasChildOrganizations={data.hasChildOrganizations}
		/>
	</section>

	<section class="grid gap-4">
		<header>
			<h2 class="text-base font-semibold">Security</h2>
			<p class="text-muted-foreground text-sm">How you sign in and prove it's you.</p>
		</header>

		<PasswordSettings />
		<TwoFactorSettings totpAvailable={data.totpAvailable} />
	</section>

	<!--
		Its own section, and last. A destructive action shouldn't sit in the same
		visual group as the settings above it — the heading is the pause.
	-->
	<section class="grid gap-4">
		<header>
			<h2 class="text-base font-semibold">Danger zone</h2>
			<p class="text-muted-foreground text-sm">Irreversible, and only for you.</p>
		</header>

		<DeleteAccountSettings email={data.user.email} />
	</section>
</div>
