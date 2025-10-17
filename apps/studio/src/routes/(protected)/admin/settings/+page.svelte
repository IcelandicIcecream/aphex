<script lang="ts">
	import { Card } from '@aphex/ui/shadcn/card';
	import * as Tabs from '@aphex/ui/shadcn/tabs';
	import type { PageData } from './$types';
	import AccountSettings from './_components/AccountSettings.svelte';
	import ApiKeysSettings from './_components/ApiKeysSettings.svelte';
	import OrganizationsSettings from './_components/OrganizationsSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground mt-1">Manage your account, API keys, and organizations</p>
	</div>

	<Tabs.Root value="api-keys" class="w-full">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
			<Tabs.Trigger value="api-keys">API Keys</Tabs.Trigger>
			<Tabs.Trigger value="organizations">Organizations</Tabs.Trigger>
		</Tabs.List>

		<!-- Account Tab -->
		<Tabs.Content value="account">
			<Card class="p-6">
				<AccountSettings user={data.user} />
			</Card>
		</Tabs.Content>

		<!-- API Keys Tab -->
		<Tabs.Content value="api-keys">
			<Card class="p-6">
				<ApiKeysSettings apiKeys={data.apiKeys} />
			</Card>
		</Tabs.Content>

		<!-- Organizations Tab -->
		<Tabs.Content value="organizations">
			<Card class="p-6">
				<OrganizationsSettings
					activeOrganization={data.activeOrganization}
					currentUserId={data.user.id}
					isSuperAdmin={data.user.role === 'super_admin'}
				/>
			</Card>
		</Tabs.Content>
	</Tabs.Root>
</div>
