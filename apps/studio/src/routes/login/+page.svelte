<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphex/ui/shadcn/button';
	import { Input } from '@aphex/ui/shadcn/input';
	import { Label } from '@aphex/ui/shadcn/label';
	import * as Card from '@aphex/ui/shadcn/card';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let mode: 'signin' | 'signup' = $state('signin');
	let resetPasswordMode = $state(false);
	let resetSuccess = $state('');
	let devResetUrl = $state(''); // Store dev reset URL separately

	// Error messages mapping
	const errorMessages: Record<string, string> = {
		session_expired: 'Your session has expired. Please log in again.',
		no_organization:
			'No organization found. Please contact an administrator to be invited to an organization.',
		unauthorized: 'You do not have permission to access this resource.',
		kicked_from_org:
			'Your access to the organization has been revoked. Please contact your administrator.',
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
		resetSuccess = '';
		loading = true;

		try {
			if (resetPasswordMode) {
				const response = await fetch('/api/user/request-password-reset', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						email,
						redirectTo: `${window.location.origin}/reset-password`
					})
				});

				const result = await response.json();

				if (!response.ok || result.error) {
					error = result.message || 'Failed to send reset email';
				} else {
					if (result.resetUrl) {
						// In development, show the reset URL for testing
						devResetUrl = result.resetUrl;
						resetSuccess = `✨ Dev Mode: Reset link generated (check below)`;
					} else {
						resetSuccess = 'Check your email for the password reset link';
					}
				}
			} else if (mode === 'signin') {
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
					goto(resolve('/admin'));
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
		resetSuccess = '';
		resetPasswordMode = false;
	}

	function toggleResetMode() {
		resetPasswordMode = !resetPasswordMode;
		error = '';
		resetSuccess = '';
	}
</script>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">
					{resetPasswordMode ? 'Reset Password' : mode === 'signin' ? 'Sign In' : 'Create Account'}
				</Card.Title>
				<Card.Description class="text-center">
					{resetPasswordMode
						? 'Enter your email to receive a reset link'
						: mode === 'signin'
							? 'Access your CMS dashboard'
							: 'Get started with Aphex CMS'}
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Success Alert -->
					{#if resetSuccess}
						<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
							<p class="text-sm font-medium text-green-700 dark:text-green-400">{resetSuccess}</p>
						</div>
					{/if}

					<!-- Dev-only Reset URL -->
					{#if devResetUrl}
						<div class="space-y-2 rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
							<p class="font-mono text-xs text-blue-700 dark:text-blue-400">
								DEV MODE - Reset URL:
							</p>
							<div class="rounded border bg-white p-2 dark:bg-gray-900">
								<code class="select-all break-all text-xs text-blue-600 dark:text-blue-400"
									>{devResetUrl}</code
								>
							</div>
							<button
								type="button"
								class="text-xs text-blue-600 hover:underline dark:text-blue-400"
								onclick={() => {
									navigator.clipboard.writeText(devResetUrl);
								}}
							>
								📋 Copy to clipboard
							</button>
						</div>
					{/if}

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

					<!-- Password Field (hidden in reset mode) -->
					{#if !resetPasswordMode}
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password">Password</Label>
								{#if mode === 'signin'}
									<button
										type="button"
										class="text-primary text-xs hover:underline"
										onclick={toggleResetMode}
									>
										Forgot password?
									</button>
								{/if}
							</div>
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
					{/if}

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
						{resetPasswordMode ? 'Send Reset Link' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
					</Button>

					<!-- Back to Sign In (in reset mode) -->
					{#if resetPasswordMode}
						<Button type="button" variant="ghost" class="w-full" onclick={toggleResetMode}>
							← Back to Sign In
						</Button>
					{/if}
				</form>
			</Card.Content>

			<Card.Footer class="flex flex-col space-y-4">
				{#if !resetPasswordMode}
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
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Footer -->
		<p class="text-muted-foreground mt-6 text-center text-xs">
			Aphex CMS - Built with SvelteKit & Better Auth
		</p>
	</div>
</div>
