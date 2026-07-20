<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Mode = 'signin' | 'signup' | 'reset-password';

	// Read initial mode + prefilled email from URL (used by invite flow)
	const initialMode: Mode = page.url.searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
	const prefilledEmail = page.url.searchParams.get('email') ?? '';
	// When the email came from an invite link, lock the field so users can't
	// sign up with an address that won't match the invitation.
	const emailLocked = prefilledEmail.length > 0 && initialMode === 'signup';

	let email = $state(prefilledEmail);
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let mode: Mode = $state(initialMode);
	let resetSuccess = $state('');
	let signupSuccess = $state(false);
	// Email tied to the most recent unverified-signin attempt, so the resend
	// button knows which address to re-send to even after the user edits the
	// email field.
	let unverifiedEmail = $state('');
	let resendLoading = $state(false);
	let resendMessage = $state('');
	// Client-side cooldown timer in seconds. Cosmetic — server enforces the
	// real rate limit. Stops accidental double-clicks and signals that we
	// won't send another email yet.
	let resendCooldown = $state(0);
	const RESEND_COOLDOWN_SECONDS = 60;

	// Get callback URL for post-login redirect (used by invite flow)
	let callbackUrl = $derived(page.url.searchParams.get('callbackUrl'));

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
			if (mode === 'reset-password') {
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
					resetSuccess = 'Check your email for the password reset link';
				}
			} else if (mode === 'signin') {
				const result = await authClient.signIn.email({
					email,
					password
				});

				if (result.error) {
					if (result.error.code === 'EMAIL_NOT_VERIFIED') {
						error =
							'Please verify your email address before signing in. Check your inbox for a verification link.';
						unverifiedEmail = email;
					} else {
						error = result.error.message || 'Failed to sign in';
						unverifiedEmail = '';
					}
				} else {
					goto(callbackUrl || '/admin');
				}
			} else {
				// mode === 'signup'
				const result = await authClient.signUp.email({
					email,
					password,
					name: email.split('@')[0] // Use email username as name
				});

				if (result.error) {
					error = result.error.message || 'Failed to sign up';
				} else if (data.requireEmailVerification) {
					// Verification required — show confirmation instead of redirecting
					signupSuccess = true;
				} else {
					// Verification off: sign-up auto-signs the user in, so go straight in
					goto(callbackUrl || '/admin');
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function setMode(newMode: Mode) {
		mode = newMode;
		error = '';
		resetSuccess = '';
		resendMessage = '';
		unverifiedEmail = '';
	}

	async function handleResendVerification(targetEmail: string) {
		if (!targetEmail || resendCooldown > 0) return;
		resendLoading = true;
		resendMessage = '';
		try {
			const result = await authClient.sendVerificationEmail({
				email: targetEmail,
				callbackURL: '/admin'
			});
			if (result.error) {
				resendMessage = result.error.message || 'Failed to resend verification email';
			} else {
				resendMessage = `Verification email sent to ${targetEmail}.`;
			}
		} catch (err) {
			resendMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
		} finally {
			resendLoading = false;
			startResendCooldown();
		}
	}

	function startResendCooldown() {
		resendCooldown = RESEND_COOLDOWN_SECONDS;
		const interval = setInterval(() => {
			resendCooldown -= 1;
			if (resendCooldown <= 0) {
				clearInterval(interval);
				resendCooldown = 0;
			}
		}, 1000);
	}
</script>

<svelte:head>
	<title>{mode === 'signin' ? 'Aphex CMS - Sign In' : 'Aphex CMS - Sign Up'}</title>
	<meta
		name="description"
		content={mode === 'signin'
			? 'Sign in to your Aphex CMS dashboard to manage your content and organizations.'
			: 'Create a new account to get started with Aphex CMS and manage your content.'}
	/>
</svelte:head>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">
					{mode === 'reset-password'
						? 'Reset Password'
						: mode === 'signin'
							? 'Sign In'
							: 'Create Account'}
				</Card.Title>
				<Card.Description class="text-center">
					{mode === 'reset-password'
						? 'Enter your email to receive a reset link'
						: mode === 'signin'
							? 'Access your CMS dashboard'
							: 'Get started with Aphex CMS'}
				</Card.Description>
			</Card.Header>

			<Card.Content>
				{#if signupSuccess}
					<div class="space-y-4">
						<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
							<p class="font-medium text-green-700 dark:text-green-400">
								Account created! Check your email to verify your address.
							</p>
							<p class="text-muted-foreground mt-2 text-sm">
								We sent a verification link to <strong>{email}</strong>
							</p>
						</div>
						{#if resendMessage}
							<div class="bg-muted/50 rounded-lg border p-3">
								<p class="text-muted-foreground text-sm">{resendMessage}</p>
							</div>
						{/if}
						<Button
							type="button"
							variant="outline"
							class="w-full"
							disabled={resendLoading || resendCooldown > 0}
							onclick={() => handleResendVerification(email)}
						>
							{#if resendLoading}
								Sending…
							{:else if resendCooldown > 0}
								Resend in {resendCooldown}s
							{:else}
								Didn't get the email? Resend
							{/if}
						</Button>
						<Button
							variant="ghost"
							class="w-full"
							onclick={() => {
								signupSuccess = false;
								setMode('signin');
							}}
						>
							Back to Sign In
						</Button>
					</div>
				{:else}
					<form onsubmit={handleSubmit} class="space-y-4">
						<!-- Success Alert -->
						{#if resetSuccess}
							<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
								<p class="text-sm font-medium text-green-700 dark:text-green-400">{resetSuccess}</p>
							</div>
						{/if}

						<!-- Error Alert -->
						{#if error}
							<div class="border-destructive/50 bg-destructive/10 space-y-2 rounded-lg border p-3">
								<p class="text-destructive text-sm font-medium">{error}</p>
								{#if unverifiedEmail}
									<button
										type="button"
										class="text-primary text-xs font-medium hover:underline disabled:opacity-50"
										disabled={resendLoading || resendCooldown > 0}
										onclick={() => handleResendVerification(unverifiedEmail)}
									>
										{#if resendLoading}
											Sending…
										{:else if resendCooldown > 0}
											Resend in {resendCooldown}s
										{:else}
											Resend verification email
										{/if}
									</button>
								{/if}
							</div>
						{/if}

						{#if resendMessage}
							<div class="bg-muted/50 rounded-lg border p-3">
								<p class="text-muted-foreground text-sm">{resendMessage}</p>
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
								readonly={emailLocked}
							/>
							{#if emailLocked}
								<p class="text-muted-foreground text-xs">Locked to match your invitation.</p>
							{/if}
						</div>

						<!-- Password Field (hidden in reset mode) -->
						{#if mode !== 'reset-password'}
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<Label for="password">Password</Label>
									{#if mode === 'signin'}
										<button
											type="button"
											class="text-primary text-xs hover:underline"
											onclick={() => setMode('reset-password')}
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
							{mode === 'reset-password'
								? 'Send Reset Link'
								: mode === 'signin'
									? 'Sign In'
									: 'Sign Up'}
						</Button>

						<!-- Back to Sign In (in reset mode) -->
						{#if mode === 'reset-password'}
							<Button
								type="button"
								variant="ghost"
								class="w-full"
								onclick={() => setMode('signin')}
							>
								← Back to Sign In
							</Button>
						{/if}
					</form>
				{/if}
			</Card.Content>

			<Card.Footer class="flex flex-col space-y-4">
				{#if !signupSuccess && mode !== 'reset-password'}
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

					<Button
						type="button"
						variant="outline"
						class="w-full"
						onclick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
					>
						{mode === 'signin' ? 'Create an account' : 'Sign in instead'}
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Footer -->
		<p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p>

		<!-- Footer Logo -->
		<div class="mt-2 flex justify-center opacity-20">
			<svg
				class="h-8 w-8 fill-black dark:fill-white"
				viewBox="0 0 40 40"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M13.956 3.43635L18.1456 3.43635L20.1641 3.43712C20.1666 3.43712 20.169 3.43842 20.1703 3.44054C20.1715 3.44258 20.1737 3.44386 20.1761 3.44396C22.062 3.5162 23.7574 4.60042 24.6713 6.33551L39.9102 35.267C40.2138 35.8434 39.7924 36.539 39.1397 36.5389L37.0679 36.5386C36.7688 36.5385 36.4919 36.3839 36.3355 36.1298L33.3801 31.3267C33.3173 31.2248 33.234 31.1371 33.1354 31.0693L24.6492 25.2343C23.457 24.4143 22.9948 22.8169 23.5659 21.4933L24.9105 18.3752C25.0235 18.1132 25.0007 17.813 24.8495 17.5726L22.392 13.664C22.0261 13.0821 21.1578 13.1443 20.8721 13.773L17.1504 21.9631C16.9899 22.3162 17.0829 22.7318 17.3781 22.9805L23.2854 27.9596C23.4723 28.1172 23.5518 28.3711 23.488 28.6038C23.2148 29.5985 22.4862 30.3843 21.5288 30.7153L19.6562 31.3627C18.9307 31.6136 18.1203 31.4916 17.4756 31.0346L14.7977 29.1361C14.3844 28.8431 13.807 28.969 13.5495 29.4083L12.1813 31.7429L10.9914 33.8867C10.8996 34.052 10.7565 34.1831 10.5839 34.26L5.47512 36.5347C4.73679 36.8634 3.99524 36.0938 4.35059 35.3675L15.9857 11.5884C16.2933 10.9599 15.7701 10.2485 15.08 10.3567L5.31911 11.8868C4.98066 11.9398 4.64386 11.7884 4.46008 11.5005L0.164217 4.77114C-0.203334 4.19538 0.213947 3.43746 0.898521 3.43741L13.956 3.43635Z"
				/>
			</svg>
		</div>
	</div>
</div>
