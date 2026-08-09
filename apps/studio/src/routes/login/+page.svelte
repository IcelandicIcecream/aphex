<script lang="ts">
	import { authClient, isTwoFactorRedirect } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import Logo from '$lib/components/Logo.svelte';
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
	let accountDeleted = $state(false);
	let loading = $state(false);
	let mode: Mode = $state(initialMode);
	let resetSuccess = $state('');
	let signupSuccess = $state(false);
	// Claim code for an unclaimed instance. Shown only while no one has signed up.
	let claimCode = $state('');
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
		no_session: 'Please log in to continue.',
		two_factor_expired:
			'Your two-factor code request expired. Enter your password again to get a new one.'
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

	// Deleting your account ends the session, so the confirmation can't be a toast in
	// the admin — there's no admin left to show it in. It rides here on the redirect
	// instead, and is cleared from the URL so a bookmark or refresh doesn't repeat it.
	$effect(() => {
		if (page.url.searchParams.get('deleted') !== '1') return;
		accountDeleted = true;
		const url = new URL(window.location.href);
		url.searchParams.delete('deleted');
		window.history.replaceState({}, '', url);
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
				} else if (isTwoFactorRedirect(result.data)) {
					// The password was right, but this account has an authenticator enrolled.
					// No session exists yet — better-auth issued a short-lived 2FA cookie and is
					// waiting for a TOTP (or backup) code. Carry the callback across the
					// challenge so an invite link still lands where it meant to.
					const next = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '';
					goto(`/two-factor${next}`);
				} else {
					goto(callbackUrl || '/admin');
				}
			} else {
				// A cookie, not a header: the bootstrap policy reads the code while the
				// sign-up request is being handled, and this form can't set a header on
				// the request the auth client makes. A cookie rides along with it.
				if (data.unclaimed && claimCode.trim()) {
					setBootstrapCookie(claimCode.trim());
				}

				const result = await authClient.signUp.email({
					email,
					password,
					name: email.split('@')[0] // Use email username as name
				});

				// The code has been read by now, whatever the outcome — the policy runs
				// inside the request above. Clear it rather than leaving a credential in
				// `document.cookie` for its full lifetime; a failed attempt re-sets it
				// from the field, which is still filled in.
				clearBootstrapCookie();

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

	const BOOTSTRAP_COOKIE = 'aphex_bootstrap_code';

	/**
	 * `Secure` whenever the page is served over HTTPS, so the code can't be read
	 * off a plaintext request — it can't be set unconditionally because local dev
	 * runs on http://localhost, where a `Secure` cookie is simply dropped.
	 *
	 * `SameSite=Lax` keeps it off cross-site requests. It can't be `HttpOnly`:
	 * only the server can set that, and this value originates in the browser.
	 * Short-lived and cleared as soon as sign-up returns to limit the window.
	 */
	function setBootstrapCookie(value: string) {
		const secure = location.protocol === 'https:' ? '; secure' : '';
		document.cookie = `${BOOTSTRAP_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=120; samesite=lax${secure}`;
	}

	function clearBootstrapCookie() {
		const secure = location.protocol === 'https:' ? '; secure' : '';
		document.cookie = `${BOOTSTRAP_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
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
						{#if accountDeleted}
							<div class="bg-muted/50 rounded-lg border p-3">
								<p class="text-sm font-medium">Your account has been deleted.</p>
								<p class="text-muted-foreground mt-1 text-sm">
									Your profile and profile picture are gone, and you've been removed from every
									workspace.
								</p>
							</div>
						{/if}

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
								<PasswordInput
									id="password"
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

						<!-- Claim Code (unclaimed instance, sign-up only) -->
						{#if mode === 'signup' && data.unclaimed}
							<div class="space-y-2">
								<Label for="claim-code">Claim code</Label>
								<Input
									id="claim-code"
									type="text"
									placeholder="Paste the code from your server log"
									bind:value={claimCode}
									autocomplete="off"
									spellcheck={false}
								/>
								<p class="text-muted-foreground text-xs">
									Nobody administers this instance yet. Enter the claim code printed in the server
									log at startup to become the super admin. Leave it blank to sign up as an editor.
								</p>
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
		<div class="mt-2 flex justify-center">
			<Logo class="text-foreground h-8 w-8" />
		</div>
	</div>
</div>
