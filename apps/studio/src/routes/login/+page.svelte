<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphex/ui/shadcn/button';
	import { Input } from '@aphex/ui/shadcn/input';
	import { Label } from '@aphex/ui/shadcn/label';
	import * as Card from '@aphex/ui/shadcn/card';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let mode: 'signin' | 'signup' = $state('signin');

	// Error messages mapping
	const errorMessages: Record<string, string> = {
		session_expired: 'Your session has expired. Please log in again.',
		no_organization: 'No organization found. Please contact an administrator to be invited to an organization.',
		unauthorized: 'You do not have permission to access this resource.',
		kicked_from_org: 'Your access to the organization has been revoked. Please contact your administrator.',
		no_session: 'Please log in to continue.'
	};

	// Read error from URL reactively (Svelte 5)
	$effect(() => {
		const errorCode = page.url.searchParams.get('error');
		if (errorCode && errorMessages[errorCode]) {
			error = errorMessages[errorCode];
			// Clear error from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('error');
			window.history.replaceState({}, '', url);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			if (mode === 'signin') {
				const result = await authClient.signIn.email({
					email,
					password
				});

				if (result.error) {
					error = result.error.message || 'Failed to sign in';
				} else {
					goto('/admin');
				}
			} else {
				const result = await authClient.signUp.email({
					email,
					password,
					name: email.split('@')[0] // Use email username as name
				});

				if (result.error) {
					error = result.error.message || 'Failed to sign up';
				} else {
					goto('/admin');
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'signin' ? 'signup' : 'signin';
		error = '';
	}
</script>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">
					{mode === 'signin' ? 'Sign In' : 'Create Account'}
				</Card.Title>
				<Card.Description class="text-center">
					{mode === 'signin' ? 'Access your CMS dashboard' : 'Get started with Aphex CMS'}
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Error Alert -->
					{#if error}
						<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
							<p class="text-destructive text-sm font-medium">{error}</p>
						</div>
					{/if}

					<!-- Email Field -->
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</div>

					<!-- Password Field -->
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
							autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
						/>
						{#if mode === 'signup'}
							<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
						{/if}
					</div>

					<!-- Submit Button -->
					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							<svg
								class="mr-2 h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						{mode === 'signin' ? 'Sign In' : 'Sign Up'}
					</Button>
				</form>
			</Card.Content>

			<Card.Footer class="flex flex-col space-y-4">
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t"></span>
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-card text-muted-foreground px-2">
							{mode === 'signin' ? 'New to Aphex?' : 'Already have an account?'}
						</span>
					</div>
				</div>

				<Button type="button" variant="outline" class="w-full" onclick={toggleMode}>
					{mode === 'signin' ? 'Create an account' : 'Sign in instead'}
				</Button>
			</Card.Footer>
		</Card.Root>

		<!-- Footer -->
		<p class="text-muted-foreground mt-6 text-center text-xs">
			Aphex CMS - Built with SvelteKit & Better Auth
		</p>
	</div>
</div>
