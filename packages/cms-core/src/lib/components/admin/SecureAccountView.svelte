<script lang="ts">
	/**
	 * Someone following "This wasn't me" in a security email. A button, because mail
	 * scanners open links: nothing happens until a person presses it.
	 */
	import { goto } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { ApiError } from '../../api/client';
	import { user } from '../../api/user';
	import AuthPageShell from './AuthPageShell.svelte';
	import type { SecureAccountViewProps } from '../../admin/client-config';

	let { data, title, authClient }: SecureAccountViewProps = $props();

	let loading = $state(false);
	let error = $state('');
	/** Used or expired: pressing again can't help. */
	let dead = $state(false);
	let done = $state<{ passwordReset: boolean } | null>(null);

	async function secure() {
		loading = true;
		error = '';
		try {
			const result = await user.secureAccount({ token: data.token });
			if (!result.success || !result.data) {
				error = result.error || 'Something went wrong. Try again.';
				return;
			}
			done = result.data;
			// The session is gone; this clears the cookie's short-lived copy of it. A failure
			// only means it lapses by itself within a minute.
			await authClient?.signOut().catch(() => {});
		} catch (err) {
			dead = err instanceof ApiError && err.status === 400;
			error = err instanceof Error ? err.message : 'Something went wrong. Try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{title} — Secure your account</title>
	<meta name="robots" content="noindex" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<AuthPageShell branding={data.branding} {title}>
	<Card.Root class="shadow-lg">
		<Card.Header class="space-y-1">
			<Card.Title class="text-center text-2xl font-bold">
				{done ? 'Your account is locked down' : 'Secure your account'}
			</Card.Title>
			<Card.Description class="text-center">
				{#if done?.passwordReset}
					Every device is signed out within a minute, and the old password no longer works. We've
					emailed you a link to choose a new one.
				{:else if done}
					Every device is signed out within a minute. Sign in again the way you usually do, and
					check that account's security too.
				{:else}
					This signs out every device, including this one. If you sign in with a password, it stops
					working and we email you a link to choose a new one.
				{/if}
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			{#if done}
				<p class="text-muted-foreground text-sm">
					Once you're back in, open Settings and check for API keys, connected apps and team members
					you don't recognise. They stay in place, so your site keeps working.
				</p>
				<Button class="w-full" onclick={() => goto('/admin/login', { invalidateAll: true })}>
					Go to sign in
				</Button>
			{:else}
				{#if error}
					<div
						role="alert"
						class="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm font-medium"
					>
						{error}
						{#if dead}
							<p class="mt-1 font-normal">
								If you still need to, reset your password from the sign-in page: that signs out
								every device too.
							</p>
						{/if}
					</div>
				{/if}
				{#if dead}
					<Button class="w-full" onclick={() => goto('/admin/login')}>Go to sign in</Button>
				{:else}
					<Button class="w-full" onclick={secure} disabled={loading}>
						{loading ? 'Securing…' : 'Secure my account'}
					</Button>
					<Button variant="ghost" class="w-full" onclick={() => goto('/admin')}>
						It was me, leave it as it is
					</Button>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</AuthPageShell>
