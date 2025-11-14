<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '@aphexcms/ui/shadcn/dialog';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { invalidateAll } from '$app/navigation';
	import { Users, Mail, Crown, Shield, Edit, Eye } from 'lucide-svelte';
	import type { Organization, OrganizationMember, CMSUser, Invitation } from '@aphexcms/cms-core';
	import { organizations } from '@aphexcms/cms-core/client';

	type OrganizationWithMembers = Organization & {
		members: Array<OrganizationMember & { user: CMSUser; invitedEmail?: string | null }>;
	};

	type Props = {
		activeOrganization: OrganizationWithMembers | null;
		currentUserId: string;
		pendingInvitations?: Invitation[];
	};

	let { activeOrganization, currentUserId, pendingInvitations = [] }: Props = $props();

	let editOrgDialogOpen = $state(false);
	let inviteMemberDialogOpen = $state(false);
	let editOrgName = $state('');
	let editOrgSlug = $state('');
	let isUpdatingOrg = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<'admin' | 'editor' | 'viewer'>('editor');
	let isInviting = $state(false);

	const roleOptions = [
		{ value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
		{ value: 'editor', label: 'Editor', description: 'Can create and edit content' },
		{ value: 'viewer', label: 'Viewer', description: 'Can only view content' }
	];

	const currentUserRole = $derived(
		activeOrganization?.members.find((m) => m.userId === currentUserId)?.role
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
		if (!inviteEmail.trim()) {
			alert('Please enter an email address');
			return;
		}

		isInviting = true;
		try {
			const result = await organizations.inviteMember({
				email: inviteEmail.trim(),
				role: inviteRole
			});

			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to invite member');
			}

			// Reset form
			inviteEmail = '';
			inviteRole = 'editor';
			inviteMemberDialogOpen = false;

			// Refresh data
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to invite member');
		} finally {
			isInviting = false;
		}
	}

	async function cancelInvitation(invitationId: string, email: string) {
		if (!confirm(`Cancel invitation for ${email}?`)) {
			return;
		}

		try {
			const result = await organizations.cancelInvitation({ invitationId });

			if (!result.success) {
				throw new Error(result.error || 'Failed to cancel invitation');
			}

			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to cancel invitation');
		}
	}

	async function removeMember(userId: string, userName: string) {
		if (!confirm(`Are you sure you want to remove ${userName} from the organization?`)) {
			return;
		}

		try {
			const result = await organizations.removeMember({ userId });

			if (!result.success) {
				throw new Error(result.error || 'Failed to remove member');
			}

			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to remove member');
		}
	}

	function openEditDialog() {
		if (!activeOrganization) return;
		editOrgName = activeOrganization.name;
		editOrgSlug = activeOrganization.slug;
		editOrgDialogOpen = true;
	}

	async function updateOrganization() {
		if (!activeOrganization) return;
		if (!editOrgName.trim() || !editOrgSlug.trim()) {
			alert('Please enter both organization name and slug');
			return;
		}

		isUpdatingOrg = true;
		try {
			const result = await organizations.update(activeOrganization.id, {
				name: editOrgName.trim(),
				slug: editOrgSlug.trim()
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to update organization');
			}

			editOrgDialogOpen = false;
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to update organization');
		} finally {
			isUpdatingOrg = false;
		}
	}
</script>

<div class="mb-6">
	<h2 class="text-xl font-semibold">Organization</h2>
	<p class="text-muted-foreground mt-1 text-sm">Manage your organization and members</p>
</div>

{#if !activeOrganization}
	<div class="text-muted-foreground py-12 text-center">
		<Users class="mx-auto mb-4 h-12 w-12 opacity-50" />
		<p class="text-lg">No active organization</p>
		<p class="mt-2 text-sm">You need to be added to an organization</p>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Organization Details -->
		<div class="rounded-lg border p-6">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold">{activeOrganization.name}</h3>
					<p class="text-muted-foreground text-sm">@{activeOrganization.slug}</p>
				</div>
				<div class="grid items-center gap-2 sm:flex">
					<Badge variant={getRoleBadgeVariant(currentUserRole || '')}>
						{currentUserRole}
					</Badge>
					{#if canManageMembers}
						<Button variant="outline" size="sm" onclick={openEditDialog}>Edit</Button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Edit Organization Dialog -->
		{#if canManageMembers}
			<Dialog bind:open={editOrgDialogOpen}>
				<DialogContent class="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Edit Organization</DialogTitle>
						<DialogDescription>Update your organization name and slug</DialogDescription>
					</DialogHeader>
					<div class="space-y-4 py-4">
						<div>
							<Label for="edit-org-name">Organization Name</Label>
							<Input
								id="edit-org-name"
								bind:value={editOrgName}
								placeholder="Acme Inc"
								class="mt-1"
							/>
						</div>
						<div>
							<Label for="edit-org-slug">Slug</Label>
							<Input
								id="edit-org-slug"
								bind:value={editOrgSlug}
								placeholder="acme-inc"
								class="mt-1"
							/>
							<p class="text-muted-foreground mt-1 text-xs">
								Used in URLs. Letters, numbers, and hyphens only.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onclick={() => (editOrgDialogOpen = false)}
							disabled={isUpdatingOrg}
						>
							Cancel
						</Button>
						<Button onclick={updateOrganization} disabled={isUpdatingOrg}>
							{isUpdatingOrg ? 'Updating...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		{/if}

		<!-- Members List -->
		<div class="rounded-lg border">
			<div class="flex items-center justify-between border-b p-4">
				<div>
					<h3 class="font-semibold">Members</h3>
					<p class="text-muted-foreground text-sm">
						{activeOrganization.members.length} member{activeOrganization.members.length !== 1
							? 's'
							: ''}
					</p>
				</div>
				{#if canManageMembers}
					<Dialog bind:open={inviteMemberDialogOpen}>
						<DialogTrigger>
							<Button variant="outline" size="sm">
								<Mail size={16} class="mr-2" />
								Invite Member
							</Button>
						</DialogTrigger>
						<DialogContent class="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle>Invite Member</DialogTitle>
								<DialogDescription>
									Invite a new member to {activeOrganization.name}
								</DialogDescription>
							</DialogHeader>
							<div class="space-y-4 py-4">
								<div>
									<Label for="invite-email">Email Address</Label>
									<Input
										id="invite-email"
										type="email"
										bind:value={inviteEmail}
										placeholder="user@example.com"
										class="mt-1"
									/>
								</div>
								<div>
									<Label for="invite-role">Role</Label>
									<Select.Root type="single" name="role" bind:value={inviteRole}>
										<Select.Trigger class="mt-1 w-full">
											{roleOptions.find((opt) => opt.value === inviteRole)?.label || 'Select role'}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each roleOptions as option (option.value)}
													<Select.Item value={option.value} label={option.label}>
														<div>
															<div class="font-medium">{option.label}</div>
															<div class="text-muted-foreground text-xs">{option.description}</div>
														</div>
													</Select.Item>
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onclick={() => (inviteMemberDialogOpen = false)}
									disabled={isInviting}
								>
									Cancel
								</Button>
								<Button onclick={inviteMember} disabled={isInviting}>
									{isInviting ? 'Inviting...' : 'Send Invite'}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				{/if}
			</div>

			<div class="divide-y">
				{#each activeOrganization.members as member (member.id)}
					{@const RoleIcon = getRoleIcon(member.role)}
					{@const isCurrentUser = member.userId === currentUserId}
					{@const canRemove = canManageMembers && !isCurrentUser && member.role !== 'owner'}

					<div class="grid items-center justify-between p-4 sm:flex">
						<div class="flex items-center gap-3">
							<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
								<RoleIcon size={20} class="text-primary" />
							</div>
							<div>
								<p class="font-medium">
									{member.user.name || member.user.email}
									{#if isCurrentUser}
										<span class="text-muted-foreground text-sm">(You)</span>
									{/if}
								</p>
								<p class="text-muted-foreground text-sm">
									{member.user.email}
									{#if member.invitedEmail && member.invitedEmail !== member.user.email}
										<span class="text-muted-foreground/70 ml-1"
											>• Invited as {member.invitedEmail}</span
										>
									{/if}
								</p>
							</div>
						</div>
						<div class="flex items-center">
							<Badge class="mt-2 sm:mt-0" variant={getRoleBadgeVariant(member.role)}>
								{member.role}
							</Badge>
							{#if canRemove}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeMember(member.userId, member.user.name || member.user.email)}
								>
									Remove
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pending Invitations -->
		{#if pendingInvitations.length > 0}
			<div class="rounded-lg border">
				<div class="border-b p-4">
					<h3 class="font-semibold">Pending Invitations</h3>
					<p class="text-muted-foreground text-sm">
						{pendingInvitations.length} pending invitation{pendingInvitations.length !== 1
							? 's'
							: ''}
					</p>
				</div>

				<div class="divide-y">
					{#each pendingInvitations as invitation (invitation.id)}
						{@const daysUntilExpiry = Math.ceil(
							(invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
						)}

						<div class="flex items-center justify-between p-4">
							<div class="flex items-center gap-3">
								<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
									<Mail size={20} class="text-muted-foreground" />
								</div>
								<div>
									<p class="font-medium">{invitation.email}</p>
									<p class="text-muted-foreground text-sm">
										Invited {new Date(invitation.createdAt).toLocaleDateString()} • Expires in {daysUntilExpiry}
										day{daysUntilExpiry !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant="outline">{invitation.role}</Badge>
								{#if canManageMembers}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => cancelInvitation(invitation.id, invitation.email)}
									>
										Cancel
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
