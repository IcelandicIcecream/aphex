<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { toast } from 'svelte-sonner';
	import { instance } from '../../api/instance';
	import type { AdminGodModeData } from '../../admin/view-data';
	import CreateOrganization from './CreateOrganization.svelte';
	import OrganizationsList from './OrganizationsList.svelte';

	let { data, userEmail }: { data: AdminGodModeData; userEmail: string } = $props();

	const tabs = [
		{ id: 'general', label: 'General', href: '/admin/god-mode' },
		{ id: 'organizations', label: 'Organizations', href: '/admin/god-mode/organizations' }
	];

	// Seeded from the load, then owned here so a failed save can put it back.
	let allowUserOrgCreation = $state(false);
	let saving = $state(false);

	$effect(() => {
		if (data.tab === 'organizations') allowUserOrgCreation = data.allowUserOrgCreation;
	});

	async function toggleOrgCreation(checked: boolean) {
		const previous = allowUserOrgCreation;
		allowUserOrgCreation = checked;
		saving = true;
		try {
			const result = await instance.updateSettings({ allowUserOrgCreation: checked });
			if (!result.success) throw new Error(result.error ?? 'Could not save');
		} catch (error) {
			allowUserOrgCreation = previous;
			toast.error(error instanceof Error ? error.message : 'Could not save');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>God Mode</title>
</svelte:head>

<div class="flex-1 overflow-auto p-4 md:p-8">
	<div class="mx-auto w-full max-w-6xl space-y-6">
		<div>
			<h1 class="text-3xl font-semibold">God Mode</h1>
			<p class="text-muted-foreground">Instance administration</p>
		</div>

		<nav class="border-b">
			<div class="flex gap-4">
				{#each tabs as tab (tab.id)}
					<a
						href={tab.href}
						class="border-b-2 px-1 pb-2 text-sm font-medium transition-colors {data.tab === tab.id
							? 'border-primary text-primary'
							: 'text-muted-foreground hover:text-foreground border-transparent'}"
					>
						{tab.label}
					</a>
				{/each}
			</div>
		</nav>

		{#if data.tab === 'general'}
			<Card.Root>
				<Card.Header>
					<Card.Title>Instance information</Card.Title>
					<Card.Description>Details about this Aphex instance</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">Admin</span>
						<span class="text-sm font-medium">{userEmail}</span>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<div>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-medium">
						In this instance
						<span class="text-muted-foreground ml-1">· {data.organizations.length}</span>
					</h2>
					<CreateOrganization />
				</div>
				<OrganizationsList orgs={data.organizations} />
			</div>

			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="space-y-0.5">
					<Label for="prevent-org-creation" class="text-base font-medium">
						Prevent anyone else from creating an organization.
					</Label>
					<p class="text-muted-foreground text-sm">
						Toggling this on will let only you create organizations. You will have to invite users
						to new organizations.
					</p>
				</div>
				<Switch
					id="prevent-org-creation"
					checked={!allowUserOrgCreation}
					onCheckedChange={(checked) => toggleOrgCreation(!checked)}
					disabled={saving}
				/>
			</div>
		{/if}
	</div>
</div>
