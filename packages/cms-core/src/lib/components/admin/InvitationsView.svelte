<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { invitations } from '../../api/invitations';
	import { organizations } from '../../api/organizations';
	import type { AdminAuthClient } from '../../admin/client-auth.svelte';
	import type { AdminInvitationsData } from '../../admin/view-data';
	import CreateOrganization from './CreateOrganization.svelte';

	let {
		data,
		title,
		authClient
	}: { data: AdminInvitationsData; title: string; authClient?: AdminAuthClient } = $props();

	const brandTitle = $derived(data.branding?.title ?? title);

	// Seeded once from load data, then owned locally (accept/reject splice it) —
	// deliberately not a $derived, so untrack the read to signal intent.
	let pendingInvitations = $state(untrack(() => data.pendingInvitations));
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

	function timeUntilExpiry(date: Date | string) {
		const diff = new Date(date).getTime() - Date.now();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days <= 0) return 'Expired';
		if (days === 1) return '1 day left';
		return `${days} days left`;
	}

	async function handleSignOut() {
		await authClient?.signOut?.();
		goto('/admin/login');
	}
</script>

<svelte:head>
	<title>{brandTitle} — Invitations</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Top bar -->
	<header class="flex items-center justify-between px-6 py-4">
		{#if data.branding?.logoUrl}
			<img src={data.branding.logoUrl} alt={brandTitle} class="max-h-8 w-auto object-contain" />
		{:else}
			<p class="text-sm font-semibold">{brandTitle}</p>
		{/if}
		{#if authClient?.signOut}
			<button
				class="text-muted-foreground hover:text-foreground text-sm transition-colors"
				onclick={handleSignOut}
			>
				{data.userEmail} · Sign out
			</button>
		{:else}
			<p class="text-muted-foreground text-sm">{data.userEmail}</p>
		{/if}
	</header>

	<!-- Content -->
	<main class="flex flex-1 flex-col items-center justify-center px-4 pb-24">
		{#if error}
			<div
				class="bg-destructive/10 text-destructive border-destructive/20 mb-6 w-full max-w-md rounded-lg border p-4"
			>
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		{#if pendingInvitations.length === 0}
			<!-- Empty state with envelope illustration -->
			<div class="flex flex-col items-center text-center">
				<svg
					class="mb-6 h-32 w-32"
					viewBox="0 0 200 200"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<!-- Envelope body -->
					<rect
						x="40"
						y="70"
						width="120"
						height="80"
						rx="4"
						fill="currentColor"
						class="text-muted/30"
					/>
					<!-- Envelope flap (open) -->
					<path d="M40 70 L100 30 L160 70" fill="currentColor" class="text-muted/20" />
					<path
						d="M40 70 L100 30 L160 70"
						stroke="currentColor"
						stroke-width="1.5"
						class="text-muted/40"
						fill="none"
					/>
					<!-- Letter paper -->
					<rect
						x="55"
						y="45"
						width="90"
						height="65"
						rx="2"
						fill="currentColor"
						class="text-muted/50"
					/>
					<!-- Letter lines -->
					<rect x="65" y="58" width="40" height="3" rx="1.5" fill="hsl(var(--primary))" />
					<line
						x1="65"
						y1="70"
						x2="130"
						y2="70"
						stroke="currentColor"
						stroke-width="2"
						class="text-muted/30"
					/>
					<line
						x1="65"
						y1="78"
						x2="125"
						y2="78"
						stroke="currentColor"
						stroke-width="2"
						class="text-muted/30"
					/>
					<line
						x1="65"
						y1="86"
						x2="115"
						y2="86"
						stroke="currentColor"
						stroke-width="2"
						class="text-muted/30"
					/>
					<rect x="65" y="96" width="30" height="3" rx="1.5" fill="hsl(var(--primary))" />
					<!-- Cursor decorations -->
					<path
						d="M28 80 L22 86 L24 87 L22 93 L30 85 L27 84 Z"
						fill="currentColor"
						class="text-muted/40"
					/>
					<path
						d="M172 68 L166 74 L168 75 L166 81 L174 73 L171 72 Z"
						fill="currentColor"
						class="text-muted/40"
					/>
					<path
						d="M85 24 L79 30 L81 31 L79 37 L87 29 L84 28 Z"
						fill="currentColor"
						class="text-muted/30"
					/>
					<path
						d="M38 120 L32 126 L34 127 L32 133 L40 125 L37 124 Z"
						fill="currentColor"
						class="text-muted/25"
					/>
				</svg>

				<h2 class="text-lg font-semibold">No pending invites</h2>
				<p class="text-muted-foreground mt-2 text-sm">
					You can see here if someone invites you to a workspace
				</p>

				{#if data.canCreateOrganization && !data.hasOrganization}
					<div class="mt-6"><CreateOrganization /></div>
				{/if}

				{#if data.hasOrganization}
					<Button class="mt-6" onclick={() => goto('/admin')}>Back to home</Button>
				{:else if authClient?.signOut}
					<Button class="mt-6" onclick={handleSignOut}>Sign out</Button>
				{/if}
			</div>
		{:else}
			<!-- Invitation cards -->
			<div class="w-full max-w-xl space-y-4">
				<div class="mb-6 text-center">
					<h2 class="text-lg font-semibold">Pending Invitations</h2>
					<p class="text-muted-foreground mt-1 text-sm">
						You've been invited to join the following organizations
					</p>
				</div>

				{#each pendingInvitations as invitation (invitation.id)}
					{@const isAccepting = acceptingId === invitation.id}
					{@const isRejecting = rejectingId === invitation.id}
					{@const isBusy = acceptingId !== null || rejectingId !== null}

					<div class="bg-card flex items-center justify-between gap-4 rounded-lg border p-5">
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
							<Button size="sm" onclick={() => handleAccept(invitation)} disabled={isBusy}>
								{isAccepting ? 'Joining...' : 'Accept'}
							</Button>
						</div>
					</div>
				{/each}

				{#if data.canCreateOrganization && !data.hasOrganization}
					<div class="pt-2 text-center"><CreateOrganization /></div>
				{/if}

				{#if data.hasOrganization}
					<div class="pt-2 text-center">
						<Button variant="ghost" onclick={() => goto('/admin')}>Back to home</Button>
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>
