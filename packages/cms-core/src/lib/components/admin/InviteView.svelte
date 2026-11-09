<script lang="ts">
	/** Someone following an invite link. A signed-in invitee never sees this: the load accepts for them. */
	import { goto } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import AuthPageShell from './AuthPageShell.svelte';
	import type { AdminInviteData } from '../../admin/view-data';

	let { data, title }: { data: AdminInviteData; title: string } = $props();

	const callback = $derived(`callbackUrl=${encodeURIComponent(`/admin/invite/${data.token}`)}`);
	const email = $derived(data.invitation?.email ?? '');
</script>

<svelte:head>
	<title>{title} — Invitation</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPageShell branding={data.branding} {title}>
	<Card.Root class="shadow-lg">
		{#if data.status === 'invalid'}
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">Invalid Invitation</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground text-center">
					This invitation link is invalid or has been revoked.
				</p>
				<Button class="mt-6 w-full" onclick={() => goto('/admin/login')}>Go to Sign In</Button>
			</Card.Content>
		{:else if data.status === 'expired'}
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">Invitation Expired</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground text-center">
					This invitation has expired. Please ask the organization admin to send a new one.
				</p>
				<Button class="mt-6 w-full" onclick={() => goto('/admin/login')}>Go to Sign In</Button>
			</Card.Content>
		{:else if data.status === 'already_accepted'}
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">Already Accepted</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground text-center">This invitation has already been accepted.</p>
				<Button class="mt-6 w-full" onclick={() => goto('/admin')}>Go to Dashboard</Button>
			</Card.Content>
		{:else if data.status === 'email_mismatch'}
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">Wrong Account</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground text-center">
					This invitation was sent to <strong>{email}</strong>. Sign out, then follow the link again
					with that address.
				</p>
				<Button class="mt-6 w-full" onclick={() => goto('/admin')}>Go to Dashboard</Button>
			</Card.Content>
		{:else}
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">You're Invited</Card.Title>
				<Card.Description class="text-center">Sign in to accept this invitation</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="bg-muted/50 rounded-lg p-4 text-center">
						{#if data.organization}
							<p class="text-lg font-semibold">{data.organization.name}</p>
							<p class="text-muted-foreground text-sm">/{data.organization.slug}</p>
						{/if}
						{#if data.invitation}
							<Badge variant="outline" class="mt-2 capitalize">{data.invitation.role}</Badge>
						{/if}
					</div>

					<p class="text-muted-foreground text-center text-sm">
						Create an account with <strong>{email}</strong> to join this organization.
					</p>

					<Button
						class="w-full"
						onclick={() =>
							goto(`/admin/login?mode=signup&email=${encodeURIComponent(email)}&${callback}`)}
					>
						Create Account to Accept
					</Button>

					<Button variant="outline" class="w-full" onclick={() => goto(`/admin/login?${callback}`)}>
						Already have an account? Sign In
					</Button>
				</div>
			</Card.Content>
		{/if}
	</Card.Root>
</AuthPageShell>
