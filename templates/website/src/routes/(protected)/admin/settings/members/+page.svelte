<script lang="ts">
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { confirmDialog, organizations, usePermissions } from '@aphexcms/cms-core/client/ui';
	import { invalidateAll } from '$app/navigation';
	import { Mail, MoreVertical, Search, Send, Users } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const activeOrganization = $derived(data.activeOrganization);
	const currentUserId = $derived(data.user.id);
	const pendingInvitations = $derived((data as any).pendingInvitations ?? []);
	const inviteRoles = $derived(
		((data as any).inviteRoles ?? []) as Array<{ name: string; description: string | null }>
	);

	let inviteEmail = $state('');
	let inviteRole = $state<string>('editor');
	let isInviting = $state(false);
	let searchQuery = $state('');
	let roleFilter = $state('all');
	let statusFilter = $state('all');

	$effect(() => {
		if (inviteRoles.length > 0 && !inviteRoles.some((r) => r.name === inviteRole)) {
			inviteRole = inviteRoles[0].name;
		}
	});

	const perms = usePermissions();
	const canInvite = $derived(perms.can('member.invite'));
	const canRemoveMembers = $derived(perms.can('member.remove'));
	const roleOptions = $derived(
		Array.from(
			new Set([
				...(activeOrganization?.members.map((member) => member.role) ?? []),
				...inviteRoles.map((role) => role.name)
			])
		).sort()
	);
	const filteredMembers = $derived(
		(activeOrganization?.members ?? []).filter((member) => {
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch =
				!query ||
				(member.user.name || '').toLowerCase().includes(query) ||
				member.user.email.toLowerCase().includes(query);
			const matchesRole = roleFilter === 'all' || member.role === roleFilter;
			const matchesStatus = statusFilter === 'all' || statusFilter === 'active';

			return matchesSearch && matchesRole && matchesStatus;
		})
	);
	const filteredInvitations = $derived(
		pendingInvitations.filter((invitation: any) => {
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch = !query || invitation.email.toLowerCase().includes(query);
			const matchesRole = roleFilter === 'all' || invitation.role === roleFilter;
			const matchesStatus = statusFilter === 'all' || statusFilter === 'pending';

			return matchesSearch && matchesRole && matchesStatus;
		})
	);
	const visiblePeopleCount = $derived(filteredMembers.length + filteredInvitations.length);

	function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
		switch (role) {
			case 'owner':
				return 'default';
			case 'admin':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function getInitials(name: string | null, email: string): string {
		if (name) {
			return name
				.split(' ')
				.map((w) => w[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return email[0].toUpperCase();
	}

	function formatRole(role: string): string {
		return role.replace(/_/g, ' ');
	}

	async function inviteMember() {
		if (!inviteEmail.trim()) return;

		isInviting = true;
		try {
			const result = await organizations.inviteMember({
				email: inviteEmail.trim(),
				role: inviteRole
			});

			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to invite member');
			}

			toast.success(`Invitation sent to ${inviteEmail.trim()}`);
			inviteEmail = '';
			inviteRole = 'editor';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to invite member');
		} finally {
			isInviting = false;
		}
	}

	async function cancelInvitation(invitationId: string, email: string) {
		const confirmCancelInvitation = await confirmDialog({
			title: `Cancel invitation for ${email}?`,
			description:
				'The user will not be able to join the organization if the invitation is revoked. They can still re-join with a new invitation later.',
			confirmText: 'Revoke',
			variant: 'destructive'
		});
		if (!confirmCancelInvitation) return;

		try {
			const result = await organizations.cancelInvitation({ invitationId });
			if (!result.success) throw new Error(result.error || 'Failed to cancel invitation');
			toast.success(`Invitation for ${email} revoked`);
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
		}
	}

	async function removeMember(userId: string, userName: string) {
		const confirmed = await confirmDialog({
			title: `Remove ${userName}?`,
			description: `${userName} will lose access to this organization. They can be re-invited later.`,
			confirmText: 'Remove',
			variant: 'destructive'
		});
		if (!confirmed) return;

		try {
			const result = await organizations.removeMember({ userId });
			if (!result.success) throw new Error(result.error || 'Failed to remove member');
			toast.success(`${userName} has been removed`);
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove member');
		}
	}
</script>

<svelte:head>
	<title>Aphex CMS - Members</title>
</svelte:head>

<div class="grid gap-5">
	{#if !activeOrganization}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<Users class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
				<p class="text-muted-foreground text-lg">No active organization</p>
			</Card.Content>
		</Card.Root>
	{:else}
		{#if canInvite}
			<Card.Root class="border-dashed">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base">
						<Send class="h-4 w-4" />
						Invite member
					</Card.Title>
					<Card.Description>Send an invitation to join this organization.</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col gap-3 lg:flex-row lg:items-end">
						<div class="flex-1">
							<Input
								id="invite-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="email@example.com"
							/>
						</div>
						<div class="lg:w-[170px]">
							<Select.Root type="single" name="role" bind:value={inviteRole}>
								<Select.Trigger>
									<span class="capitalize">{formatRole(inviteRole)}</span>
								</Select.Trigger>
								<Select.Content>
									{#each inviteRoles as option (option.name)}
										<Select.Item value={option.name} label={option.name}>
											<div>
												<div class="font-medium capitalize">{formatRole(option.name)}</div>
												{#if option.description}
													<div class="text-muted-foreground text-xs">{option.description}</div>
												{/if}
											</div>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<Button class="lg:w-auto" onclick={inviteMember} disabled={isInviting}>
							{isInviting ? 'Sending...' : 'Send invite'}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header class="gap-4">
				<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<Card.Title>Team directory</Card.Title>
						<Card.Description>Search, filter, and manage organization access.</Card.Description>
					</div>
					<Badge variant="secondary" class="w-fit text-xs">{visiblePeopleCount} shown</Badge>
				</div>
				<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
					<div class="relative">
						<Search
							class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
						/>
						<Input bind:value={searchQuery} placeholder="Search by name or email" class="pl-9" />
					</div>
					<Select.Root type="single" name="role-filter" bind:value={roleFilter}>
						<Select.Trigger>
							<span>{roleFilter === 'all' ? 'All roles' : formatRole(roleFilter)}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All roles">All roles</Select.Item>
							{#each roleOptions as role (role)}
								<Select.Item value={role} label={formatRole(role)}>
									<span class="capitalize">{formatRole(role)}</span>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" name="status-filter" bind:value={statusFilter}>
						<Select.Trigger>
							<span>{statusFilter === 'all' ? 'All statuses' : statusFilter}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="All statuses">All statuses</Select.Item>
							<Select.Item value="active" label="Active">Active</Select.Item>
							<Select.Item value="pending" label="Pending">Pending</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</Card.Header>
			<Card.Content class="pt-0">
				<div class="border-border hidden overflow-hidden rounded-lg border md:block">
					<div
						class="bg-muted/30 text-muted-foreground grid grid-cols-[minmax(260px,1fr)_150px_150px_64px] border-b px-4 py-2 text-xs font-medium tracking-wide uppercase"
					>
						<div>Member</div>
						<div>Role</div>
						<div>Status</div>
						<div></div>
					</div>
					<div class="divide-y">
						{#each filteredMembers as member (member.id)}
							{@const isCurrentUser = member.userId === currentUserId}
							{@const canRemove = canRemoveMembers && !isCurrentUser && member.role !== 'owner'}
							<div
								class="grid grid-cols-[minmax(260px,1fr)_150px_150px_64px] items-center px-4 py-3"
							>
								<div class="flex min-w-0 items-center gap-3">
									<Avatar.Root class="h-10 w-10">
										{#if member.user.image}
											<Avatar.Image
												src={member.user.image}
												alt={member.user.name || member.user.email}
												class="object-cover"
											/>
										{/if}
										<Avatar.Fallback class="text-xs"
											>{getInitials(member.user.name, member.user.email)}</Avatar.Fallback
										>
									</Avatar.Root>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">
											{member.user.name || member.user.email}
											{#if isCurrentUser}<span class="text-muted-foreground font-normal">(You)</span
												>{/if}
										</p>
										{#if member.user.name}<p class="text-muted-foreground truncate text-xs">
												{member.user.email}
											</p>{/if}
									</div>
								</div>
								<div>
									<Badge variant={getRoleBadgeVariant(member.role)} class="capitalize"
										>{formatRole(member.role)}</Badge
									>
								</div>
								<div class="flex items-center gap-2 text-sm">
									<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Active
								</div>
								<div class="flex justify-end">
									{#if canRemove}
										<Button
											variant="outline"
											size="sm"
											onclick={() =>
												removeMember(member.userId, member.user.name || member.user.email)}
										>
											<MoreVertical class="h-4 w-4" />
											<span class="sr-only">Remove</span>
										</Button>
									{/if}
								</div>
							</div>
						{/each}

						{#each filteredInvitations as invitation (invitation.id)}
							<div
								class="grid grid-cols-[minmax(260px,1fr)_150px_150px_64px] items-center px-4 py-3"
							>
								<div class="flex min-w-0 items-center gap-3">
									<div
										class="border-muted-foreground/25 flex h-10 w-10 items-center justify-center rounded-full border border-dashed"
									>
										<Mail class="text-muted-foreground h-4 w-4" />
									</div>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{invitation.email}</p>
										<p class="text-muted-foreground truncate text-xs">Invitation sent</p>
									</div>
								</div>
								<div>
									<Badge variant="outline" class="capitalize">{formatRole(invitation.role)}</Badge>
								</div>
								<div>
									<Badge variant="secondary" class="bg-amber-100 text-amber-700 hover:bg-amber-100"
										>Pending</Badge
									>
								</div>
								<div class="flex justify-end">
									{#if canInvite}
										<Button
											variant="outline"
											size="sm"
											onclick={() => cancelInvitation(invitation.id, invitation.email)}
										>
											<MoreVertical class="h-4 w-4" />
											<span class="sr-only">Revoke</span>
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="space-y-3 md:hidden">
					{#each filteredMembers as member (member.id)}
						{@const isCurrentUser = member.userId === currentUserId}
						{@const canRemove = canRemoveMembers && !isCurrentUser && member.role !== 'owner'}
						<div class="border-border rounded-lg border p-4">
							<div class="flex items-start gap-3">
								<Avatar.Root class="h-11 w-11">
									{#if member.user.image}
										<Avatar.Image
											src={member.user.image}
											alt={member.user.name || member.user.email}
											class="object-cover"
										/>
									{/if}
									<Avatar.Fallback class="text-xs"
										>{getInitials(member.user.name, member.user.email)}</Avatar.Fallback
									>
								</Avatar.Root>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">
										{member.user.name || member.user.email}
										{#if isCurrentUser}<span class="text-muted-foreground font-normal">(You)</span
											>{/if}
									</p>
									<p class="text-muted-foreground truncate text-xs">{member.user.email}</p>
								</div>
							</div>
							<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
								<div>
									<p class="text-muted-foreground text-xs">Role</p>
									<Badge variant={getRoleBadgeVariant(member.role)} class="mt-1 capitalize"
										>{formatRole(member.role)}</Badge
									>
								</div>
								<div>
									<p class="text-muted-foreground text-xs">Status</p>
									<p class="mt-1 flex items-center gap-2">
										<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Active
									</p>
								</div>
							</div>
							{#if canRemove}
								<Button
									class="mt-4 w-full"
									variant="outline"
									size="sm"
									onclick={() => removeMember(member.userId, member.user.name || member.user.email)}
								>
									Remove member
								</Button>
							{/if}
						</div>
					{/each}

					{#each filteredInvitations as invitation (invitation.id)}
						<div class="border-border rounded-lg border border-dashed p-4">
							<div class="flex items-start gap-3">
								<div
									class="border-muted-foreground/25 flex h-11 w-11 items-center justify-center rounded-full border border-dashed"
								>
									<Mail class="text-muted-foreground h-4 w-4" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{invitation.email}</p>
									<p class="text-muted-foreground truncate text-xs">Invitation pending</p>
								</div>
							</div>
							<div class="mt-4 flex flex-wrap items-center gap-2">
								<Badge variant="outline" class="capitalize">{formatRole(invitation.role)}</Badge>
								<Badge variant="secondary" class="bg-amber-100 text-amber-700 hover:bg-amber-100"
									>Pending</Badge
								>
							</div>
							{#if canInvite}
								<Button
									class="mt-4 w-full"
									variant="outline"
									size="sm"
									onclick={() => cancelInvitation(invitation.id, invitation.email)}
								>
									Revoke invitation
								</Button>
							{/if}
						</div>
					{/each}
				</div>

				{#if visiblePeopleCount === 0}
					<div class="border-border rounded-lg border border-dashed py-10 text-center">
						<Users class="text-muted-foreground mx-auto mb-3 h-8 w-8" />
						<p class="text-sm font-medium">No matching members</p>
						<p class="text-muted-foreground text-xs">Try another search or filter.</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
