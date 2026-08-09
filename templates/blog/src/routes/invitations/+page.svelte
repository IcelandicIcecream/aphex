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
			class="h-8 w-8 text-black dark:text-white"
			viewBox="0 0 512 512"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M260.616 105.082C260.626 105.082 260.635 105.087 260.64 105.096C260.645 105.104 260.653 105.109 260.663 105.109L274.644 105.112C282.748 105.114 290.156 109.573 294.103 116.823L445.131 394.268C445.878 395.639 445.62 397.342 444.501 398.436L415.541 426.751C413.86 428.394 411.074 427.947 410.002 425.862L382.043 371.473C381.842 371.081 381.567 370.731 381.235 370.441L289.225 290.294C285.241 286.824 283.96 281.084 286.099 276.289L304.656 234.68C305.138 233.599 305.041 232.349 304.398 231.358L276.521 188.455C275.032 186.164 271.601 186.408 270.436 188.888L225.858 283.804C225.177 285.254 225.568 286.978 226.806 287.987L282.077 333.058C283.735 334.41 284.439 336.626 283.859 338.669C281.377 347.419 274.822 354.323 266.285 357.18L248.665 363.075C242.243 365.224 235.145 364.2 229.469 360.306L201.046 340.806C199.372 339.658 197.071 340.181 196.05 341.943L162.258 400.225C161.65 401.273 161.627 402.558 162.197 403.623L203.526 480.844C205.176 483.928 201.757 487.262 198.717 485.534L95.0729 426.613C93.4445 425.688 92.8431 423.638 93.7113 421.972L228.285 163.793C229.541 161.383 227.691 158.532 224.982 158.704L30.3807 171.043C27.4433 171.23 25.6193 167.92 27.341 165.527L69.7919 106.539C70.4501 105.624 71.5077 105.082 72.6326 105.082L260.616 105.082Z"
				fill="currentColor"
			/>
			<circle cx="256" cy="256" r="225.28" stroke="currentColor" stroke-width="61.44" />
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
