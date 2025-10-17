<script lang="ts">
	import { Button } from '@aphex/ui/shadcn/button';
	import { Input } from '@aphex/ui/shadcn/input';
	import { Label } from '@aphex/ui/shadcn/label';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '@aphex/ui/shadcn/dialog';
	import * as Select from '@aphex/ui/shadcn/select';
	import { Badge } from '@aphex/ui/shadcn/badge';
	import { invalidateAll } from '$app/navigation';
	import { Users, Mail, Crown, Shield, Edit, Eye } from 'lucide-svelte';
	import type { Organization, OrganizationMember, OrganizationRole, CMSUser } from '@aphex/cms-core';
	import { organizations } from '@aphex/cms-core/client';

	type OrganizationWithMembers = Organization & {
		members: Array<OrganizationMember & { user: CMSUser }>;
	};

	type Props = {
		activeOrganization: OrganizationWithMembers | null;
		currentUserId: string;
		isSuperAdmin: boolean;
	};

	let { activeOrganization, currentUserId, isSuperAdmin }: Props = $props();

	let createOrgDialogOpen = $state(false);
	let inviteMemberDialogOpen = $state(false);
	let newOrgName = $state('');
	let newOrgSlug = $state('');
	let isCreatingOrg = $state(false);
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

	const canManageMembers = $derived(
		currentUserRole === 'owner' || currentUserRole === 'admin'
	);

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

	async function createOrganization() {
		if (!newOrgName.trim() || !newOrgSlug.trim()) {
			alert('Please enter both organization name and slug');
			return;
		}

		isCreatingOrg = true;
		try {
			const result = await organizations.create({
				name: newOrgName.trim(),
				slug: newOrgSlug.trim(),
				parentOrganizationId: activeOrganization?.id || null
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to create organization');
			}

			// Reset form
			newOrgName = '';
			newOrgSlug = '';
			createOrgDialogOpen = false;

			// Refresh data
			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to create organization');
		} finally {
			isCreatingOrg = false;
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

	// Auto-generate slug from name
	$effect(() => {
		if (newOrgName && !newOrgSlug) {
			newOrgSlug = newOrgName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
		}
	});
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h2 class="text-xl font-semibold">Organizations</h2>
		<p class="text-muted-foreground mt-1 text-sm">Manage your organization and members</p>
	</div>
	{#if isSuperAdmin}
		<Dialog bind:open={createOrgDialogOpen}>
			<DialogTrigger>
				<Button>Create Organization</Button>
			</DialogTrigger>
			<DialogContent class="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create Organization</DialogTitle>
					<DialogDescription>
						{#if activeOrganization}
							Create a child organization under {activeOrganization.name}. You will become the owner.
						{:else}
							Create a new organization. You will become the owner.
						{/if}
					</DialogDescription>
				</DialogHeader>
				<div class="space-y-4 py-4">
					<div>
						<Label for="org-name">Organization Name</Label>
						<Input
							id="org-name"
							bind:value={newOrgName}
							placeholder="Acme Inc"
							class="mt-1"
						/>
					</div>
					<div>
						<Label for="org-slug">Slug</Label>
						<Input
							id="org-slug"
							bind:value={newOrgSlug}
							placeholder="acme-inc"
							class="mt-1"
						/>
						<p class="text-muted-foreground mt-1 text-xs">
							Used in URLs. Letters, numbers, and hyphens only.
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onclick={() => (createOrgDialogOpen = false)} disabled={isCreatingOrg}>
						Cancel
					</Button>
					<Button onclick={createOrganization} disabled={isCreatingOrg}>
						{isCreatingOrg ? 'Creating...' : 'Create'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/if}
</div>

{#if !activeOrganization}
	<div class="text-muted-foreground py-12 text-center">
		<Users class="mx-auto mb-4 h-12 w-12 opacity-50" />
		<p class="text-lg">No active organization</p>
		<p class="mt-2 text-sm">
			{#if isSuperAdmin}
				Create an organization to get started
			{:else}
				You need to be added to an organization
			{/if}
		</p>
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
				<Badge variant={getRoleBadgeVariant(currentUserRole || '')}>
					{currentUserRole}
				</Badge>
			</div>
		</div>

		<!-- Members List -->
		<div class="rounded-lg border">
			<div class="flex items-center justify-between border-b p-4">
				<div>
					<h3 class="font-semibold">Members</h3>
					<p class="text-muted-foreground text-sm">
						{activeOrganization.members.length} member{activeOrganization.members.length !== 1 ? 's' : ''}
					</p>
				</div>
				{#if canManageMembers}
					<Dialog bind:open={inviteMemberDialogOpen}>
						<DialogTrigger>
							<Button size="sm">
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
									<Select.Root
										type="single"
										name="role"
										bind:value={inviteRole}
									>
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
								<Button variant="outline" onclick={() => (inviteMemberDialogOpen = false)} disabled={isInviting}>
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

					<div class="flex items-center justify-between p-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
								<RoleIcon size={20} class="text-primary" />
							</div>
							<div>
								<p class="font-medium">
									{member.user.name || member.user.email}
									{#if isCurrentUser}
										<span class="text-muted-foreground text-sm">(You)</span>
									{/if}
								</p>
								<p class="text-muted-foreground text-sm">{member.user.email}</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Badge variant={getRoleBadgeVariant(member.role)}>
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
	</div>
{/if}
