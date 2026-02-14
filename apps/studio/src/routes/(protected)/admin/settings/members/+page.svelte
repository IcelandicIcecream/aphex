<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { invalidateAll } from '$app/navigation';
	import { Mail, Crown, Shield, Edit, Eye, Users } from '@lucide/svelte';
	import type { Invitation } from '@aphexcms/cms-core';
	import { organizations } from '@aphexcms/cms-core/client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const activeOrganization = $derived(data.activeOrganization);
	const currentUserId = $derived(data.user.id);
	const pendingInvitations = $derived((data as any).pendingInvitations ?? []);

	let inviteEmail = $state('');
	let inviteRole = $state<'admin' | 'editor' | 'viewer'>('editor');
	let isInviting = $state(false);

	const roleOptions = [
		{ value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
		{ value: 'editor', label: 'Editor', description: 'Can create and edit content' },
		{ value: 'viewer', label: 'Viewer', description: 'Can only view content' }
	];

	const currentUserRole = $derived(
		activeOrganization?.members.find((m: any) => m.userId === currentUserId)?.role
	);

	const canManageMembers = $derived(currentUserRole === 'owner' || currentUserRole === 'admin');

	function getRoleIcon(role: string) {
		switch (role) {
			case 'owner':
				return Crown;
			case 'admin':
				return Shield;
			case 'editor':
				return Edit;
			case 'viewer':
				return Eye;
			default:
				return Users;
		}
	}

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

			inviteEmail = '';
			inviteRole = 'editor';
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to invite member');
		} finally {
			isInviting = false;
		}
	}

	async function cancelInvitation(invitationId: string, email: string) {
		if (!confirm(`Cancel invitation for ${email}?`)) return;

		try {
			const result = await organizations.cancelInvitation({ invitationId });
			if (!result.success) throw new Error(result.error || 'Failed to cancel invitation');
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to cancel invitation');
		}
	}

	async function removeMember(userId: string, userName: string) {
		if (!confirm(`Remove ${userName} from the organization?`)) return;

		try {
			const result = await organizations.removeMember({ userId });
			if (!result.success) throw new Error(result.error || 'Failed to remove member');
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to remove member');
		}
	}
</script>

<svelte:head>
	<title>Aphex CMS - Members</title>
</svelte:head>

<div class="grid gap-6">
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">Members</h2>
		<p class="text-muted-foreground text-sm">Manage members and invitations for your organization.</p>
	</div>

	{#if !activeOrganization}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground text-lg">No active organization</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Invite Member -->
		{#if canManageMembers}
			<Card.Root>
				<Card.Header>
					<Card.Title>Invite Member</Card.Title>
					<Card.Description>
						Send an invite to add someone to {activeOrganization.name}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-end gap-3">
						<div class="flex-1">
							<Label for="invite-email">Email address</Label>
							<Input
								id="invite-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="email@example.com"
								class="mt-1"
							/>
						</div>
						<div class="w-[130px]">
							<Select.Root type="single" name="role" bind:value={inviteRole}>
								<Select.Trigger class="mt-1">
									<span class="capitalize">{inviteRole}</span>
								</Select.Trigger>
								<Select.Content>
									{#each roleOptions as option (option.value)}
										<Select.Item value={option.value} label={option.label}>
											<div>
												<div class="font-medium">{option.label}</div>
												<div class="text-muted-foreground text-xs">{option.description}</div>
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
			<Card.Root>
				<Card.Header>
					<Card.Title>Pending Invites</Card.Title>
					<Card.Description>Invitations that haven't been accepted yet</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each pendingInvitations as invitation (invitation.id)}
							<div class="flex items-center justify-between gap-4">
								<div>
									<p class="text-sm font-medium">{invitation.email}</p>
									<Badge variant="outline">{invitation.role}</Badge>
								</div>
								{#if canManageMembers}
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
				<Card.Title>Members</Card.Title>
				<Card.Description>
					{activeOrganization.members.length} member{activeOrganization.members.length !== 1
						? 's'
						: ''} in this organization
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					{#each activeOrganization.members as member (member.id)}
						{@const RoleIcon = getRoleIcon(member.role)}
						{@const isCurrentUser = member.userId === currentUserId}
						{@const canRemove = canManageMembers && !isCurrentUser && member.role !== 'owner'}

						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<div
									class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full"
								>
									<RoleIcon size={16} class="text-primary" />
								</div>
								<div>
									<p class="text-sm font-medium">
										{member.user.name || member.user.email}
										{#if isCurrentUser}
											<span class="text-muted-foreground">(You)</span>
										{/if}
									</p>
									<div class="flex items-center gap-1">
										<Badge variant={getRoleBadgeVariant(member.role)}>
											{member.role}
										</Badge>
									</div>
								</div>
							</div>
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
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
