<script lang="ts">
	/** Someone following a password reset link. */
	import { goto } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { user } from '../../api/user';
	import AuthPageShell from './AuthPageShell.svelte';
	import PasswordInput from './PasswordInput.svelte';
	import type { AdminResetPasswordData } from '../../admin/view-data';

	let { data, title }: { data: AdminResetPasswordData; title: string } = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}
		if (newPassword.length < 8) {
			error = 'Password must be at least 8 characters long';
			return;
		}

		loading = true;
		try {
			const result = await user.resetPassword({ token: data.token, newPassword });
			if (!result.success) {
				error = result.message || result.error || 'Failed to reset password';
				return;
			}
			success = true;
			setTimeout(() => goto('/admin/login'), 2000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{title} — Reset Password</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPageShell branding={data.branding} {title}>
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
				<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
					<p class="font-medium text-green-700 dark:text-green-400">
						Your password has been reset successfully!
					</p>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="space-y-4">
					{#if error}
						<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
							<p class="text-destructive text-sm font-medium">{error}</p>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="newPassword">New Password</Label>
						<PasswordInput
							id="newPassword"
							placeholder="••••••••"
							bind:value={newPassword}
							required
							autocomplete="new-password"
							disabled={loading}
						/>
						<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword">Confirm Password</Label>
						<PasswordInput
							id="confirmPassword"
							placeholder="••••••••"
							bind:value={confirmPassword}
							required
							autocomplete="new-password"
							disabled={loading}
						/>
					</div>

					<Button type="submit" class="w-full" disabled={loading}>
						{loading ? 'Resetting…' : 'Reset Password'}
					</Button>

					<Button type="button" variant="ghost" class="w-full" onclick={() => goto('/admin/login')}>
						← Back to Login
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</AuthPageShell>
