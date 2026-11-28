<script lang="ts">
	/**
	 * Connecting an app (Claude, ChatGPT) to `/mcp`: the last step, where the user sees
	 * what the app will be able to do on the site they picked, and allows or denies it.
	 * Either way the browser goes back to the app with the answer.
	 */
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Check, X } from '@lucide/svelte';
	import AuthPageShell from './AuthPageShell.svelte';
	import { oauth } from '../../api/oauth';
	import { redirectHost } from './oauth-display';
	import type { AdminOAuthConsentData } from '../../admin/view-data';

	let { data, title }: { data: AdminOAuthConsentData; title: string } = $props();

	const app = $derived(data.authorization?.client.name ?? 'This app');
	const site = $derived(data.organization?.name ?? 'this site');

	let pending = $state<'allow' | 'deny' | null>(null);
	let error = $state('');

	async function answer(accept: boolean) {
		pending = accept ? 'allow' : 'deny';
		error = '';
		try {
			const result = await oauth.consent({ oauthQuery: data.oauthQuery, accept });
			// Back to the app, on its own origin.
			window.location.href = result.data!.url;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Try again.';
			pending = null;
		}
	}
</script>

<svelte:head>
	<title>{title} — Allow {app}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPageShell branding={data.branding} {title}>
	<Card.Root class="shadow-lg">
		{#if !data.authorization || !data.organization}
			<Card.Header class="space-y-1.5 px-8 text-center">
				<Card.Title class="text-lg">This link has expired</Card.Title>
				<Card.Description>Go back to the app you were connecting and start again.</Card.Description>
			</Card.Header>
		{:else}
			<Card.Header class="space-y-1.5 px-8 text-center">
				<Card.Title class="text-lg">Allow {app} to use {site}?</Card.Title>
				<Card.Description>
					It acts as you, {data.userEmail}, with your role on {site}.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-5 px-8">
				{#if error}
					<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
						<p class="text-destructive text-sm font-medium">{error}</p>
					</div>
				{/if}

				<ul class="space-y-2.5 text-sm">
					{#each data.scopes as scope (scope.id)}
						<li class="flex gap-2.5">
							<Check class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>{scope.description}</span>
						</li>
					{/each}
					<li class="flex gap-2.5">
						<X class="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span class="text-muted-foreground">
							It can't publish or delete unless you allow it later in Connected apps, and it can
							never change members or settings. What goes live stays with you.
						</span>
					</li>
				</ul>

				<div class="grid grid-cols-2 gap-3">
					<Button variant="outline" disabled={pending !== null} onclick={() => answer(false)}>
						{pending === 'deny' ? 'Denying…' : 'Deny'}
					</Button>
					<Button disabled={pending !== null} onclick={() => answer(true)}>
						{pending === 'allow' ? 'Allowing…' : 'Allow'}
					</Button>
				</div>

				<div class="text-muted-foreground space-y-1 text-center text-xs">
					<p>
						You'll go back to
						<span class="text-foreground font-medium"
							>{redirectHost(data.authorization.redirectUri)}</span
						>. Disconnect it any time from your account settings.
					</p>
					<p>
						<a class="hover:text-foreground underline" href="/admin/oauth/site?{data.oauthQuery}"
							>Use a different site</a
						>
					</p>
				</div>
			</Card.Content>
		{/if}
	</Card.Root>
</AuthPageShell>
