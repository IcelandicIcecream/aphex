<script lang="ts">
	/**
	 * Profile (account) settings view: identity + preferences, security (password,
	 * two-factor), and the danger zone (delete account). Core-owned; the embedded
	 * `/admin/settings/account` catch-all SSR's the profile/preferences and the
	 * `totpAvailable` flag. The password / 2FA / delete panels perform their auth
	 * mutations through the host-provided admin auth client (client-auth seam).
	 */
	import type { CMSUser } from '../../types/user';
	import type { UserSessionPreferences } from '../../types/organization';
	import AccountSettings from './AccountSettings.svelte';
	import PreferencesSettings from './PreferencesSettings.svelte';
	import PasswordSettings from './PasswordSettings.svelte';
	import TwoFactorSettings from './TwoFactorSettings.svelte';
	import DeleteAccountSettings from './DeleteAccountSettings.svelte';

	interface Props {
		user: CMSUser;
		userPreferences: UserSessionPreferences | null;
		hasChildOrganizations: boolean;
		totpAvailable: boolean;
	}

	let { user, userPreferences, hasChildOrganizations, totpAvailable }: Props = $props();
</script>

<!--
	Only Security carries a heading. The page's own tab title already says this is
	Profile, so repeating it would label the top section twice and the bottom one
	once — Security earns its heading because it's the break in subject, not
	because every group needs a title.
-->
<div class="grid gap-10">
	<section class="grid gap-4">
		<AccountSettings {user} />
		<PreferencesSettings {userPreferences} {hasChildOrganizations} />
	</section>

	<section class="grid gap-4">
		<header>
			<h2 class="text-base font-semibold">Security</h2>
			<p class="text-muted-foreground text-sm">How you sign in and prove it's you.</p>
		</header>

		<PasswordSettings />
		<TwoFactorSettings {totpAvailable} />
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

		<DeleteAccountSettings email={user.email} />
	</section>
</div>
