<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';

	// Better Auth redirects here after successful verification
	// with autoSignInAfterVerification, user may already be signed in
	let callbackUrl = $derived(page.url.searchParams.get('callbackUrl'));
</script>

<svelte:head>
	<title>Aphex CMS - Email Verified</title>
</svelte:head>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">Email Verified</Card.Title>
				<Card.Description class="text-center">
					Your email has been verified successfully
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
					<p class="font-medium text-green-700 dark:text-green-400">
						Your email address has been verified. You can now sign in.
					</p>
				</div>

				<Button class="mt-6 w-full" onclick={() => goto(callbackUrl || '/login')}>
					Continue to Sign In
				</Button>
			</Card.Content>
		</Card.Root>

		<p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p>
	</div>
</div>
