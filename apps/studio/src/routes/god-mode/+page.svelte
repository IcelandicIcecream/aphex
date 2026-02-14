<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { instance } from '@aphexcms/cms-core/client';
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
	<title>Aphex CMS - God Mode</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h2 class="text-xl font-semibold">General</h2>
		<p class="text-muted-foreground text-sm">Identify your instance and get key details.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Instance Information</Card.Title>
			<Card.Description>Details about this Aphex CMS instance</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground text-sm">Admin</span>
					<span class="text-sm font-medium">{data.user.email}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

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
