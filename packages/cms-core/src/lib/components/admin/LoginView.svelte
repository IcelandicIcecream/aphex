<script lang="ts">
	/**
	 * LoginView — the core-mounted sign-in / sign-up screen.
	 *
	 * Login is a view in the one admin catch-all (`/admin/login`), not a host route
	 * (see `createAdminLoad` + `handleAuthHook`). It stays provider-agnostic: every
	 * auth mutation goes through the host's `AdminAuthClient` (the browser twin of
	 * `AuthProvider`), so core never imports Better Auth. A host that wants a fully
	 * custom screen passes `config.components.login` instead — same props, same URL.
	 *
	 * Covers sign-in, sign-up, requesting a password reset and resending verification.
	 * The two-factor challenge and the reset link are separate views in the catch-all.
	 */
	import { goto, afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import AuthPageShell from './AuthPageShell.svelte';
	import PasswordInput from './PasswordInput.svelte';
	import type { LoginViewProps } from '../../admin/client-config';

	let { data, title, authClient }: LoginViewProps = $props();

	// Per-tenant branding (resolved server-side from the subdomain) wins over the
	// app-wide client `title`. One deployment, a different face per company.
	const brand = $derived(data.branding);
	const brandTitle = $derived(brand?.title ?? title);

	type Mode = 'signin' | 'signup' | 'reset-password';

	const initialMode: Mode = page.url.searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
	const prefilledEmail = page.url.searchParams.get('email') ?? '';
	// An invite link prefills and locks the email so sign-up can't use an address
	// that won't match the invitation.
	const emailLocked = prefilledEmail.length > 0 && initialMode === 'signup';

	let email = $state(prefilledEmail);
	let password = $state('');
	let error = $state('');
	let accountDeleted = $state(false);
	let loading = $state(false);
	let mode = $state<Mode>(initialMode);
	let resetSuccess = $state('');
	let signupSuccess = $state(false);
	let claimCode = $state('');
	let unverifiedEmail = $state('');
	let resendLoading = $state(false);
	let resendMessage = $state('');
	let resendCooldown = $state(0);
	const RESEND_COOLDOWN_SECONDS = 60;

	// Where to go next: a path on this site only, never another address.
	let callbackUrl = $derived.by(() => {
		const next = page.url.searchParams.get('callbackUrl');
		// Browsers read `/\` as `//`, which is another site.
		return next && /^\/(?![/\\])/.test(next) ? next : null;
	});
	// A new account goes where it was sent from (an invitation's own page, which
	// accepts it), else to the usual place after sign-up.
	const afterSignUp = $derived(callbackUrl ?? data.signUpDestination);

	// The host must wire sign-in/sign-up onto the auth client for this view to work.
	// When it hasn't, say so plainly rather than failing on submit.
	const authReady = $derived(Boolean(authClient?.signIn));

	// One button per social provider the server switched on, when the host's client
	// can start that flow. Hidden while resetting a password, which is email-only.
	const socialProviders = $derived(authClient?.signInSocial ? data.socialProviders : []);
	const showSocial = $derived(mode !== 'reset-password' && socialProviders.length > 0);
	let socialLoading = $state<string | null>(null);

	const providerLabels: Record<string, string> = {
		google: 'Google',
		github: 'GitHub',
		gitlab: 'GitLab',
		microsoft: 'Microsoft',
		apple: 'Apple',
		linkedin: 'LinkedIn'
	};
	const providerLabel = (provider: string) =>
		providerLabels[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);

	async function signInWith(provider: string) {
		if (!authClient?.signInSocial) return;
		error = '';
		socialLoading = provider;
		// The provider's page takes over the browser, so the claim code travels the
		// same way as on sign-up: a short-lived cookie read when the account is created.
		if (data.unclaimed && claimCode.trim()) setBootstrapCookie(claimCode.trim());
		try {
			const result = await authClient.signInSocial({
				provider,
				callbackURL: callbackUrl || '/admin',
				newUserCallbackURL: afterSignUp,
				errorCallbackURL: '/admin/login'
			});
			if (result.error) {
				error = result.error.message || `Couldn't start sign-in with ${providerLabel(provider)}`;
				socialLoading = null;
			}
			// On success the browser is already leaving for the provider.
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
			socialLoading = null;
		}
	}

	const errorMessages: Record<string, string> = {
		session_expired: 'Your session has expired. Please log in again.',
		no_organization:
			'No organization found. Please contact an administrator to be invited to an organization.',
		unauthorized: 'You do not have permission to access this resource.',
		kicked_from_org:
			'Your access to the organization has been revoked. Please contact your administrator.',
		no_session: 'Please log in to continue.',
		two_factor_expired:
			'Your two-factor code request expired. Enter your password again to get a new one.',
		// Returned by a social sign-in that was refused when the account was created,
		// which here almost always means sign-up is invite-only.
		unable_to_create_user:
			"That account can't sign up here. If you were invited, use the email address the invitation was sent to.",
		signup_disabled:
			"That account can't sign up here. If you were invited, use the email address the invitation was sent to.",
		account_not_linked:
			'An account with this email already exists. Sign in with your password, then try again.',
		email_not_found: "The provider didn't share an email address, so you can't sign in with it.",
		access_denied: 'Sign-in was cancelled.'
	};

	/**
	 * A social sign-in that fails comes back as `?error=<code>`. When the sign-up policy
	 * refuses the account (invite-only), better-auth sends the policy's own message with
	 * its spaces turned into underscores, which is written to be shown, so show it.
	 */
	function messageForError(code: string): string {
		if (errorMessages[code]) return errorMessages[code];
		const words = code.split('_').filter(Boolean);
		if (words.length >= 4) return words.join(' ');
		return "Couldn't sign you in with that account. Please try again.";
	}

	// One-shot flags arrive via the redirect query (`?error=<code>`, `?deleted=1`).
	// Show the matching message, then strip the param so a refresh doesn't repeat
	// it. In `afterNavigate` (not `$effect`) because `replaceState` throws before
	// the client router is initialized; `afterNavigate` is the first safe moment.
	afterNavigate(() => {
		const errorCode = page.url.searchParams.get('error');
		if (errorCode) error = messageForError(errorCode);
		clearBootstrapCookie();
		if (page.url.searchParams.get('deleted') === '1') accountDeleted = true;

		if (!page.url.searchParams.has('error') && !page.url.searchParams.has('deleted')) return;
		const url = new URL(page.url);
		url.searchParams.delete('error');
		url.searchParams.delete('error_description');
		url.searchParams.delete('deleted');
		try {
			replaceState(url, {});
		} catch {
			setTimeout(() => replaceState(url, {}), 0);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		resetSuccess = '';
		loading = true;

		try {
			if (mode === 'reset-password') {
				// Reset request is a plain core HTTP route, not a client-auth method.
				const response = await fetch('/api/user/request-password-reset', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						redirectTo: `${window.location.origin}/admin/reset-password`
					})
				});
				const result = await response.json();
				if (!response.ok || result.error) {
					error = result.message || 'Failed to send reset email';
				} else {
					resetSuccess = 'Check your email for the password reset link';
				}
			} else if (mode === 'signin') {
				if (!authClient?.signIn) {
					error = 'Sign-in is not configured for this instance.';
					return;
				}
				const result = await authClient.signIn({ email, password });
				if (result.error) {
					if (result.error.code === 'EMAIL_NOT_VERIFIED') {
						error =
							'Please verify your email address before signing in. Check your inbox for a verification link.';
						unverifiedEmail = email;
					} else {
						error = result.error.message || 'Failed to sign in';
						unverifiedEmail = '';
					}
				} else if (authClient.isTwoFactorRedirect?.(result.data)) {
					// Password was right but this account has 2FA on, so there's no session yet.
					const next = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '';
					await goto(`/admin/two-factor${next}`);
				} else {
					await goto(callbackUrl || '/admin');
				}
			} else {
				if (!authClient?.signUp) {
					error = 'Sign-up is not configured for this instance.';
					return;
				}
				// A cookie, not a header: the bootstrap policy reads the claim code while
				// the sign-up request is handled, and this form can't set a header on the
				// request the auth client makes.
				if (data.unclaimed && claimCode.trim()) {
					setBootstrapCookie(claimCode.trim());
				}

				const result = await authClient.signUp({
					email,
					password,
					name: email.split('@')[0] || email,
					callbackURL: afterSignUp
				});

				clearBootstrapCookie();

				if (result.error) {
					error = result.error.message || 'Failed to sign up';
				} else if (data.requireEmailVerification) {
					signupSuccess = true;
				} else {
					await goto(afterSignUp);
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	const BOOTSTRAP_COOKIE = 'aphex_bootstrap_code';

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
		if (!targetEmail || resendCooldown > 0 || !authClient?.sendVerificationEmail) return;
		resendLoading = true;
		resendMessage = '';
		try {
			const result = await authClient.sendVerificationEmail({
				email: targetEmail,
				callbackURL: afterSignUp
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
	<title>{brandTitle} — {mode === 'signin' ? 'Sign In' : 'Sign Up'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPageShell branding={brand} {title}>
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
				{#if brand?.tagline}
					{brand.tagline}
				{:else if mode === 'reset-password'}
					Enter your email to receive a reset link
				{:else if mode === 'signin'}
					Access {brandTitle}
				{:else}
					Get started with {brandTitle}
				{/if}
			</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if !authReady}
				<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
					<p class="text-destructive text-sm font-medium">
						This instance has no client auth adapter wired. Pass
						<code>adminAuthClient</code> to <code>&lt;AphexStudio config /&gt;</code>.
					</p>
				</div>
			{:else if signupSuccess}
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
				{#if showSocial}
					<div class="mb-4 space-y-2">
						{#each socialProviders as provider (provider)}
							<Button
								type="button"
								variant="outline"
								class="w-full"
								disabled={socialLoading !== null || loading}
								onclick={() => signInWith(provider)}
							>
								{#if provider === 'google'}
									<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
										<path
											fill="#4285F4"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
										/>
										<path
											fill="#34A853"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
										/>
										<path
											fill="#FBBC05"
											d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
										/>
										<path
											fill="#EA4335"
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
										/>
									</svg>
								{/if}
								{socialLoading === provider
									? 'Redirecting…'
									: `Continue with ${providerLabel(provider)}`}
							</Button>
						{/each}
						<div class="relative pt-2">
							<div class="absolute inset-0 top-2 flex items-center">
								<span class="w-full border-t"></span>
							</div>
							<div class="relative flex justify-center text-xs uppercase">
								<span class="bg-card text-muted-foreground px-2">or with email</span>
							</div>
						</div>
					</div>
				{/if}
				<form onsubmit={handleSubmit} class="space-y-4">
					{#if resetSuccess}
						<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
							<p class="text-sm font-medium text-green-700 dark:text-green-400">{resetSuccess}</p>
						</div>
					{/if}

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
							tabindex={1}
						/>
						{#if emailLocked}
							<p class="text-muted-foreground text-xs">Locked to match your invitation.</p>
						{/if}
					</div>

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
								tabindex={2}
							/>
							{#if mode === 'signup'}
								<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
							{/if}
						</div>
					{/if}

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
								Nobody administers this instance yet. Enter the claim code printed in the server log
								at startup to become the super admin. Leave it blank to sign up as an editor.
							</p>
						</div>
					{/if}

					<Button type="submit" class="w-full" disabled={loading} tabindex={3}>
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

					{#if mode === 'reset-password'}
						<Button type="button" variant="ghost" class="w-full" onclick={() => setMode('signin')}>
							← Back to Sign In
						</Button>
					{/if}
				</form>
			{/if}
		</Card.Content>

		{#if authReady}
			<Card.Footer class="flex flex-col space-y-4">
				{#if !signupSuccess && mode !== 'reset-password'}
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t"></span>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-card text-muted-foreground px-2">
								{mode === 'signin'
									? brand?.logoUrl
										? 'New here?'
										: `New to ${brandTitle}?`
									: 'Already have an account?'}
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
		{/if}
	</Card.Root>
</AuthPageShell>
