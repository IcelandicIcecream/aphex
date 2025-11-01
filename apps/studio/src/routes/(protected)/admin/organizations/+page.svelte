<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { ArrowLeft, Building2, Plus } from 'lucide-svelte';
	import CreateOrganization from './_components/CreateOrganization.svelte';
	import OrganizationsList from './_components/OrganizationsList.svelte';

	const isCreateMode = $derived(page.url.searchParams.get('action') === 'create');
	const userRole = $derived(page.data?.sidebarData?.user?.role);
	const isSuperAdmin = $derived(userRole === 'super_admin');

	function handleCancel() {
		goto('/admin');
	}

	function goToCreate() {
		goto('/admin/organizations?action=create', { invalidateAll: true });
	}
</script>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<div class="mb-6">
		<Button variant="ghost" onclick={handleCancel} class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Admin
		</Button>

		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<div
					class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12"
				>
					<Building2 class="text-primary h-5 w-5 sm:h-6 sm:w-6" />
				</div>
				<div>
					<h1 class="text-2xl font-bold sm:text-3xl">
						{isCreateMode ? 'Create Organization' : 'Organizations'}
					</h1>
					<p class="text-muted-foreground text-sm sm:text-base">
						{isCreateMode ? 'Set up a new organization for your team' : 'Manage your organizations'}
					</p>
				</div>
			</div>

			{#if !isCreateMode && isSuperAdmin}
				<Button onclick={goToCreate} class="w-full sm:w-auto">
					<Plus class="mr-2 h-4 w-4" />
					Create Organization
				</Button>
			{/if}
		</div>
	</div>

	{#if isCreateMode}
		{#if isSuperAdmin}
			<CreateOrganization />
		{:else}
			<div class="text-muted-foreground rounded-lg border p-8 text-center">
				<p class="text-lg font-medium">Access Denied</p>
				<p class="mt-2">Only super admins can create organizations.</p>
			</div>
		{/if}
	{:else}
		<OrganizationsList />
	{/if}
</div>
