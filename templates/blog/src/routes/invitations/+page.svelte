<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { invitations, organizations } from '@aphexcms/cms-core/client/api';
	import { authClient } from '$lib/auth-client';
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

	function timeUntilExpiry(date: Date | string) {
		const diff = new Date(date).getTime() - Date.now();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days <= 0) return 'Expired';
		if (days === 1) return '1 day left';
		return `${days} days left`;
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto(resolve('/login'));
	}
</script>

<svelte:head>
	<title>Aphex CMS - Invitations</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Top bar -->
	<header class="flex items-center justify-between px-6 py-4">
		<svg
			class="h-8 w-8 fill-black dark:fill-white"
			viewBox="0 0 40 40"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M13.956 3.43635L18.1456 3.43635L20.1641 3.43712C20.1666 3.43712 20.169 3.43842 20.1703 3.44054C20.1715 3.44258 20.1737 3.44386 20.1761 3.44396C22.062 3.5162 23.7574 4.60042 24.6713 6.33551L39.9102 35.267C40.2138 35.8434 39.7924 36.539 39.1397 36.5389L37.0679 36.5386C36.7688 36.5385 36.4919 36.3839 36.3355 36.1298L33.3801 31.3267C33.3173 31.2248 33.234 31.1371 33.1354 31.0693L24.6492 25.2343C23.457 24.4143 22.9948 22.8169 23.5659 21.4933L24.9105 18.3752C25.0235 18.1132 25.0007 17.813 24.8495 17.5726L22.392 13.664C22.0261 13.0821 21.1578 13.1443 20.8721 13.773L17.1504 21.9631C16.9899 22.3162 17.0829 22.7318 17.3781 22.9805L23.2854 27.9596C23.4723 28.1172 23.5518 28.3711 23.488 28.6038C23.2148 29.5985 22.4862 30.3843 21.5288 30.7153L19.6562 31.3627C18.9307 31.6136 18.1203 31.4916 17.4756 31.0346L14.7977 29.1361C14.3844 28.8431 13.807 28.969 13.5495 29.4083L12.1813 31.7429L10.9914 33.8867C10.8996 34.052 10.7565 34.1831 10.5839 34.26L5.47512 36.5347C4.73679 36.8634 3.99524 36.0938 4.35059 35.3675L15.9857 11.5884C16.2933 10.9599 15.7701 10.2485 15.08 10.3567L5.31911 11.8868C4.98066 11.9398 4.64386 11.7884 4.46008 11.5005L0.164217 4.77114C-0.203334 4.19538 0.213947 3.43746 0.898521 3.43741L13.956 3.43635Z"
			/>
		</svg>
		<button
			class="text-muted-foreground hover:text-foreground text-sm transition-colors"
			onclick={handleSignOut}
		>
			{data.user.email}
		</button>
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

				{#if data.hasOrganization}
					<Button class="mt-6" onclick={() => goto('/admin')}>Back to home</Button>
				{:else}
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

				{#if data.hasOrganization}
					<div class="pt-2 text-center">
						<Button variant="ghost" onclick={() => goto('/admin')}>Back to home</Button>
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>
