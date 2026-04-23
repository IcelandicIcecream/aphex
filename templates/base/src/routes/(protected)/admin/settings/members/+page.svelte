<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { confirmDialog, usePermissions } from '@aphexcms/cms-core';
	import { invalidateAll } from '$app/navigation';
	import { Mail, Crown, Shield, Edit, Eye, Users, Send } from '@lucide/svelte';
	import { organizations } from '@aphexcms/cms-core/client';
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

	// Ensure the selected invite role always exists in the available set.
	// Falls back to the first option if the previously-selected role was
	// deleted while the page was open.
	$effect(() => {
		if (inviteRoles.length > 0 && !inviteRoles.some((r) => r.name === inviteRole)) {
			inviteRole = inviteRoles[0].name;
		}
	});

	const currentUserRole = $derived(
		activeOrganization?.members.find((m: any) => m.userId === currentUserId)?.role
	);

	// Per-capability gates — replaces the coarse "owner/admin" role check.
	// Split per action so custom roles with just `member.invite` can invite
	// but not remove, etc.
	const perms = usePermissions();
	const canInvite = $derived(perms.can('member.invite'));
	const canRemoveMembers = $derived(perms.can('member.remove'));

	// function getRoleIcon(role: string) {
	// 	switch (role) {
	// 		case 'owner':
	// 			return Crown;
	// 		case 'admin':
	// 			return Shield;
	// 		case 'editor':
	// 			return Edit;
	// 		case 'viewer':
	// 			return Eye;
	// 		default:
	// 			return Users;
	// 	}
	// }

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

<div class="grid gap-6">
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">Members</h2>
		<p class="text-muted-foreground text-sm">
			Manage members and invitations for your organization.
		</p>
	</div>

	{#if !activeOrganization}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<Users class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
				<p class="text-muted-foreground text-lg">No active organization</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Invite Member -->
		{#if canInvite}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Send class="h-4 w-4" />
						Invite Member
					</Card.Title>
					<Card.Description>
						Send an invite to add someone to {activeOrganization.name}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-end gap-3">
						<div class="flex-1">
							<Input
								id="invite-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="email@example.com"
							/>
						</div>
						<div class="w-[160px]">
							<Select.Root type="single" name="role" bind:value={inviteRole}>
								<Select.Trigger>
									<span class="capitalize">{inviteRole}</span>
								</Select.Trigger>
								<Select.Content>
									{#each inviteRoles as option (option.name)}
										<Select.Item value={option.name} label={option.name}>
											<div>
												<div class="font-medium capitalize">{option.name}</div>
												{#if option.description}
													<div class="text-muted-foreground text-xs">{option.description}</div>
												{/if}
											</div>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<Button onclick={inviteMember} disabled={isInviting}>
							{isInviting ? 'Sending...' : 'Send Invite'}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Pending Invitations -->
		{#if pendingInvitations.length > 0}
			<Card.Root class="border-dashed">
				<Card.Header>
					<div class="flex items-center gap-2">
						<Card.Title>Pending Invites</Card.Title>
						<Badge variant="secondary" class="text-xs">{pendingInvitations.length}</Badge>
					</div>
					<Card.Description>Invitations that haven't been accepted yet</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="divide-y">
						{#each pendingInvitations as invitation, i (invitation.id)}
							<div
								class="flex items-center justify-between gap-4 {i > 0 ? 'pt-3' : ''} {i <
								pendingInvitations.length - 1
									? 'pb-3'
									: ''}"
							>
								<div class="flex items-center gap-3">
									<div
										class="border-muted-foreground/25 flex h-9 w-9 items-center justify-center rounded-full border border-dashed"
									>
										<Mail class="text-muted-foreground h-4 w-4" />
									</div>
									<div>
										<p class="text-sm font-medium">{invitation.email}</p>
										<p class="text-muted-foreground text-xs">
											Invited as <span class="capitalize">{invitation.role}</span>
										</p>
									</div>
								</div>
								{#if canInvite}
									<Button
										variant="outline"
										size="sm"
										onclick={() => cancelInvitation(invitation.id, invitation.email)}
									>
										Revoke
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Members -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<Card.Title>Members</Card.Title>
					<Badge variant="secondary" class="text-xs">
						{activeOrganization.members.length}
					</Badge>
				</div>
				<Card.Description>People with access to this organization</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="divide-y">
					{#each activeOrganization.members as member, i (member.id)}
						{@const isCurrentUser = member.userId === currentUserId}
						{@const canRemove = canRemoveMembers && !isCurrentUser && member.role !== 'owner'}

						<div
							class="flex items-center justify-between gap-4 {i > 0 ? 'pt-3' : ''} {i <
							activeOrganization.members.length - 1
								? 'pb-3'
								: ''}"
						>
							<div class="flex items-center gap-3">
								<Avatar.Root class="h-9 w-9">
									{#if member.user.image}
										<Avatar.Image
											src={member.user.image}
											alt={member.user.name || member.user.email}
										/>
									{/if}
									<Avatar.Fallback class="text-xs">
										{getInitials(member.user.name, member.user.email)}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">
										{member.user.name || member.user.email}
										{#if isCurrentUser}
											<span class="text-muted-foreground font-normal">(You)</span>
										{/if}
									</p>
									{#if member.user.name}
										<p class="text-muted-foreground truncate text-xs">
											{member.user.email}
										</p>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant={getRoleBadgeVariant(member.role)} class="capitalize">
									{member.role}
								</Badge>
								{#if canRemove}
									<Button
										variant="outline"
										size="sm"
										onclick={() =>
											removeMember(member.userId, member.user.name || member.user.email)}
									>
										Remove
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
