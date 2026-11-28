<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { toast } from 'svelte-sonner';
	import type { AdminGodModeData, AdminGodModeUser } from '../../admin/view-data';
	import { instance } from '../../api/instance';
	import { formatDate } from '../../utils/dates';
	import ConfirmDelete from './ConfirmDelete.svelte';

	let { data }: { data: Extract<AdminGodModeData, { tab: 'users' }> } = $props();

	let deleting = $state<AdminGodModeUser | null>(null);
	let open = $state(false);
	const goesToo = $derived(
		deleting?.organizations.filter((org) => org.isOnlyMember).map((org) => org.name) ?? []
	);

	function href(page: number) {
		const params = new URLSearchParams();
		if (data.search) params.set('q', data.search);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return `/admin/god-mode/users${query ? `?${query}` : ''}`;
	}

	async function search(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		event.preventDefault();
		const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
		await goto(`/admin/god-mode/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
			keepFocus: true
		});
	}

	async function remove() {
		if (!deleting) return;
		const { id, email } = deleting;
		const result = await instance.deleteUser(id, { email });
		if (!result.success) throw new Error(result.message || result.error || 'Could not delete it');
		toast.success(`${email} was deleted`);
		await invalidateAll();
	}
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h2 class="text-lg font-medium">
		{data.search ? 'Found' : 'Accounts'}
		<span class="text-muted-foreground ml-1">· {data.total}</span>
	</h2>
	<form onsubmit={search} class="flex gap-2" role="search">
		<Input
			name="q"
			type="search"
			value={data.search}
			placeholder="Name or email"
			aria-label="Search accounts"
			class="w-56"
		/>
		<Button type="submit" variant="outline">Search</Button>
	</form>
</div>

{#if data.users.length === 0}
	<p class="text-muted-foreground text-sm">
		{data.search ? 'No account matches that.' : 'No accounts here.'}
	</p>
{:else}
	<div class="divide-y rounded-lg border">
		{#each data.users as user (user.id)}
			<div class="flex items-center gap-4 p-4">
				<div class="min-w-0 flex-1">
					<div class="truncate font-medium">{user.email}</div>
					<div class="text-muted-foreground text-sm">
						{user.name ? `${user.name} · ` : ''}Joined {formatDate(user.createdAt)}
					</div>
					<div class="text-muted-foreground text-sm">
						{user.organizations.map((org) => `${org.name} (${org.role})`).join(', ') ||
							'In no workspace'}
					</div>
				</div>
				{#if user.canDelete}
					<Button
						variant="ghost"
						class="text-destructive hover:text-destructive shrink-0"
						aria-label="Delete {user.email}"
						onclick={() => {
							deleting = user;
							open = true;
						}}
					>
						Delete
					</Button>
				{/if}
			</div>
		{/each}
	</div>
{/if}

{#if data.pages > 1}
	<nav class="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
		<Button variant="outline" href={href(data.page - 1)} disabled={data.page <= 1}>Previous</Button>
		<span class="text-muted-foreground">Page {data.page} of {data.pages}</span>
		<Button variant="outline" href={href(data.page + 1)} disabled={data.page >= data.pages}>
			Next
		</Button>
	</nav>
{/if}

{#if deleting}
	<ConfirmDelete
		bind:open
		title="Delete this account?"
		phrase={deleting.email}
		action="Delete account"
		onConfirm={remove}
	>
		Their sign-in, profile and memberships are erased for good.
		{#if goesToo.length > 0}
			They're the only member of <span class="text-foreground font-medium"
				>{goesToo.join(', ')}</span
			>, so {goesToo.length === 1 ? 'it is' : 'those are'} deleted too, with every page and file.
		{/if}
	</ConfirmDelete>
{/if}
