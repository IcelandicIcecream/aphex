<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphex/ui/shadcn/button';
	import { Input } from '@aphex/ui/shadcn/input';
	import { Label } from '@aphex/ui/shadcn/label';
	import * as Card from '@aphex/ui/shadcn/card';
	import { resolve } from '$app/paths';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);
	let token = $state('');

	// Get token from URL
	$effect(() => {
		const tokenParam = page.url.searchParams.get('token');
		const errorParam = page.url.searchParams.get('error');

		if (errorParam === 'INVALID_TOKEN') {
			error = 'Invalid or expired reset link. Please request a new password reset.';
		} else if (tokenParam) {
			token = tokenParam;
		} else {
			error = 'No reset token provided. Please request a new password reset.';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (newPassword.length < 8) {
			error = 'Password must be at least 8 characters long';
			loading = false;
			return;
		}

		try {
			const result = await authClient.resetPassword({
				newPassword,
				token
			});

			if (result.error) {
				error = result.error.message || 'Failed to reset password';
			} else {
				success = true;
				setTimeout(() => {
					goto(resolve('/login'));
				}, 2000);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">
					{success ? 'Password Reset!' : 'Reset Your Password'}
				</Card.Title>
				<Card.Description class="text-center">
					{success ? 'Redirecting to login...' : 'Enter your new password'}
				</Card.Description>
			</Card.Header>

			<Card.Content>
				{#if success}
					<div class="border-green-500/50 bg-green-500/10 rounded-lg border p-4 text-center">
						<p class="text-green-700 dark:text-green-400 font-medium">
							Your password has been reset successfully!
						</p>
					</div>
				{:else}
					<form onsubmit={handleSubmit} class="space-y-4">
						<!-- Error Alert -->
						{#if error}
							<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
								<p class="text-destructive text-sm font-medium">{error}</p>
							</div>
						{/if}

						<!-- New Password Field -->
						<div class="space-y-2">
							<Label for="newPassword">New Password</Label>
							<Input
								id="newPassword"
								type="password"
								placeholder="••••••••"
								bind:value={newPassword}
								required
								autocomplete="new-password"
								disabled={!token || loading}
							/>
							<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
						</div>

						<!-- Confirm Password Field -->
						<div class="space-y-2">
							<Label for="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								bind:value={confirmPassword}
								required
								autocomplete="new-password"
								disabled={!token || loading}
							/>
						</div>

						<!-- Submit Button -->
						<Button type="submit" class="w-full" disabled={!token || loading}>
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
							Reset Password
						</Button>

						<!-- Back to Login -->
						<Button
							type="button"
							variant="ghost"
							class="w-full"
							onclick={() => goto(resolve('/login'))}
						>
							← Back to Login
						</Button>
					</form>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Footer -->
		<p class="text-muted-foreground mt-6 text-center text-xs">
			Aphex CMS - Built with SvelteKit & Better Auth
		</p>
	</div>
</div>
