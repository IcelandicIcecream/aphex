<script lang="ts">
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { instance } from '@aphexcms/cms-core/client';
	import CreateOrganization from '../_components/CreateOrganization.svelte';
	import OrganizationsList from '../../(protected)/admin/organizations/_components/OrganizationsList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let allowUserOrgCreation = $state(data.instanceSettings?.allowUserOrgCreation ?? false);
	let saving = $state(false);

	async function toggleOrgCreation(checked: boolean) {
		saving = true;
		try {
			const result = await instance.updateSettings({ allowUserOrgCreation: checked });
			if (result.success && result.data) {
				allowUserOrgCreation = result.data.allowUserOrgCreation ?? false;
			}
		} catch (error) {
			console.error('Failed to update instance settings:', error);
			allowUserOrgCreation = !checked;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Aphex CMS - Organizations</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">Organizations on this instance</h2>
		<p class="text-muted-foreground text-sm">See all organizations and control who can create them.</p>
	</div>

	<!-- Org List -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-medium">
    			In this instance
				<span class="text-muted-foreground ml-1">· {data.organizations.length}</span>
			</h3>
			<CreateOrganization />
		</div>

		<OrganizationsList orgs={data.organizations} />
	</div>

	<!-- Toggle -->
	<div class="flex items-center justify-between rounded-lg border p-4">
		<div class="space-y-0.5">
			<Label for="prevent-org-creation" class="text-base font-medium">Prevent anyone else from creating an organization.</Label>
			<p class="text-muted-foreground text-sm">
				Toggling this on will let only you create organizations. You will have to invite users to new organizations.
			</p>
		</div>
		<Switch
			id="prevent-org-creation"
			checked={!allowUserOrgCreation}
			onCheckedChange={(checked) => toggleOrgCreation(!checked)}
			disabled={saving}
		/>
	</div>

</div>
