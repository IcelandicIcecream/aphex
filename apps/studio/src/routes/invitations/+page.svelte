<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { invitations, organizations } from '@aphexcms/cms-core/client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pendingInvitations = $state(data.pendingInvitations);
	let acceptingId = $state<string | null>(null);
	let rejectingId = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function handleAccept(invitation: (typeof pendingInvitations)[0]) {
		acceptingId = invitation.id;
		error = null;

		try {
			const result = await invitations.accept(invitation.id);

			if (!result.success) {
				throw new Error(result.error || 'Failed to accept invitation');
			}

			// Switch to the newly joined org
			await organizations.switch({ organizationId: invitation.organizationId });
			await invalidateAll();
			goto('/admin');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to accept invitation';
			acceptingId = null;
		}
	}

	async function handleReject(invitation: (typeof pendingInvitations)[0]) {
		rejectingId = invitation.id;
		error = null;

		try {
			const result = await invitations.reject(invitation.id);

			if (!result.success) {
				throw new Error(result.error || 'Failed to decline invitation');
			}

			// Remove from local state
			pendingInvitations = pendingInvitations.filter((inv) => inv.id !== invitation.id);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to decline invitation';
		} finally {
			rejectingId = null;
		}
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function timeUntilExpiry(date: Date | string) {
		const diff = new Date(date).getTime() - Date.now();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days <= 0) return 'Expired';
		if (days === 1) return '1 day left';
		return `${days} days left`;
	}
</script>

<svelte:head>
	<title>Aphex CMS - Invitations</title>
</svelte:head>

<div class="flex min-h-screen items-start justify-center p-4 pt-16 md:p-8 md:pt-24">
	<div class="w-full max-w-xl">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-semibold">Pending Invitations</h1>
			<p class="text-muted-foreground mt-2">
				You've been invited to join the following organizations
			</p>
		</div>

		{#if error}
			<div class="bg-destructive/10 text-destructive border-destructive/20 mb-6 rounded-lg border p-4">
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		{#if pendingInvitations.length === 0}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<p class="text-muted-foreground text-lg">No pending invitations</p>
					<p class="text-muted-foreground mt-2 text-sm">
						When someone invites you to an organization, it will appear here.
					</p>
					<Button variant="outline" class="mt-6" onclick={() => goto('/admin')}>
						Go to Dashboard
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-4">
				{#each pendingInvitations as invitation (invitation.id)}
					{@const isAccepting = acceptingId === invitation.id}
					{@const isRejecting = rejectingId === invitation.id}
					{@const isBusy = acceptingId !== null || rejectingId !== null}

					<Card.Root>
						<Card.Content class="flex items-center justify-between gap-4 p-5">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate font-medium">{invitation.organizationName}</p>
									<Badge variant="outline" class="capitalize">{invitation.role}</Badge>
								</div>
								<div class="text-muted-foreground mt-1 flex gap-3 text-xs">
									<span>/{invitation.organizationSlug}</span>
									<span>{timeUntilExpiry(invitation.expiresAt)}</span>
								</div>
							</div>
							<div class="flex shrink-0 gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => handleReject(invitation)}
									disabled={isBusy}
								>
									{isRejecting ? 'Declining...' : 'Decline'}
								</Button>
								<Button
									size="sm"
									onclick={() => handleAccept(invitation)}
									disabled={isBusy}
								>
									{isAccepting ? 'Joining...' : 'Accept'}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<div class="mt-6 text-center">
				<Button variant="ghost" onclick={() => goto('/admin')}>
					Skip for now
				</Button>
			</div>
		{/if}
	</div>
</div>
