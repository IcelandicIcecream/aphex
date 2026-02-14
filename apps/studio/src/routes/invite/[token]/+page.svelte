<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const token = $derived(page.params.token);
</script>

<svelte:head>
	<title>Aphex CMS - Invitation</title>
</svelte:head>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			{#if data.error === 'invalid'}
				<Card.Header class="space-y-1">
					<Card.Title class="text-center text-2xl font-bold">Invalid Invitation</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground text-center">
						This invitation link is invalid or has been revoked.
					</p>
					<Button class="mt-6 w-full" onclick={() => goto('/login')}>Go to Sign In</Button>
				</Card.Content>
			{:else if data.error === 'expired'}
				<Card.Header class="space-y-1">
					<Card.Title class="text-center text-2xl font-bold">Invitation Expired</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground text-center">
						This invitation has expired. Please ask the organization admin to send a new one.
					</p>
					<Button class="mt-6 w-full" onclick={() => goto('/login')}>Go to Sign In</Button>
				</Card.Content>
			{:else if data.error === 'already_accepted'}
				<Card.Header class="space-y-1">
					<Card.Title class="text-center text-2xl font-bold">Already Accepted</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground text-center">
						This invitation has already been accepted.
					</p>
					<Button class="mt-6 w-full" onclick={() => goto('/admin')}>Go to Dashboard</Button>
				</Card.Content>
			{:else if data.error === 'email_mismatch'}
				<Card.Header class="space-y-1">
					<Card.Title class="text-center text-2xl font-bold">Wrong Account</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground text-center">
						This invitation was sent to <strong>{data.invitation?.email}</strong>. Please sign in
						with that email address to accept it.
					</p>
					<Button
						class="mt-6 w-full"
						onclick={() => goto(`/login?callbackUrl=/invite/${token}`)}
					>
						Sign In with Different Account
					</Button>
				</Card.Content>
			{:else}
				<Card.Header class="space-y-1">
					<Card.Title class="text-center text-2xl font-bold">You're Invited</Card.Title>
					<Card.Description class="text-center">
						Sign in to accept this invitation
					</Card.Description>
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
							Sign in or create an account to join this organization.
						</p>

						<Button
							class="w-full"
							onclick={() => goto(`/login?callbackUrl=/invite/${token}`)}
						>
							Sign In to Accept
						</Button>
					</div>
				</Card.Content>
			{/if}
		</Card.Root>

		<p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p>
	</div>
</div>
