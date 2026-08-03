import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { cmsLogger } from '@aphexcms/cms-core';
import type { CacheAdapter } from '@aphexcms/cms-core/server';
import type { AphexAuthConfig } from './types.js';

/** Per-address cooldown between verification emails, in seconds. */
const VERIFICATION_EMAIL_COOLDOWN = 60;

function buildCacheStorage(cache: CacheAdapter) {
	return {
		storage: 'secondary-storage' as const,
		fallbackToDatabase: true,
		customStorage: {
			get: async (key: string) => cache.get(key),
			set: async (key: string, value: string, ttl?: number) => cache.set(key, value, ttl),
			delete: async (key: string) => cache.delete(key)
		}
	};
}

/**
 * Builds the better-auth instance from an app's adapters.
 *
 * Everything the studio used to configure by hand lives here — session cookie
 * cache, API-key plugin, rate limits, the CMS user-profile sync, and the
 * password-reset / verification email flows.
 */
export function createAuthInstance(config: AphexAuthConfig) {
	const {
		database: db,
		drizzleDb,
		dialect,
		building = false,
		emailAdapter,
		email: emailConfig,
		cache,
		socialProviders,
		twoFactor,
		appName,
		betterAuth: extend
	} = config;

	const { requireEmailVerification = false, inviteOnly = false } = config.options ?? {};

	// betterAuth() throws without these, and SvelteKit's analyse pass imports every
	// server module without ever serving a request. Placeholders keep the build
	// green; at runtime `building` is false and a missing secret fails loudly.
	const secret = config.secret || (building ? 'build-placeholder-secret' : undefined);
	const baseURL = config.baseURL || (building ? 'http://localhost:3000' : undefined);
	const trustedOrigins = config.trustedOrigins?.length
		? config.trustedOrigins
		: baseURL
			? [baseURL]
			: [];

	/** Sends one auth email, tolerating an unconfigured adapter. */
	async function sendAuthEmail(
		template: 'passwordReset' | 'emailVerification',
		to: string,
		userName: string,
		url: string
	) {
		if (!emailAdapter || !emailConfig) {
			cmsLogger.warn('[Auth]', `Email adapter not configured. ${template} email not sent.`);
			return;
		}
		try {
			const { subject, render } = emailConfig[template];
			const { html, text } = await render(userName, url);
			const result = await emailAdapter.send({ from: emailConfig.from, to, subject, html, text });
			if (result.error) {
				cmsLogger.error('[Auth]', `Failed to send ${template} email:`, result.error);
			} else {
				cmsLogger.info('[Auth]', `${template} email sent`);
			}
		} catch (error) {
			cmsLogger.error('[Auth]', `Error sending ${template} email:`, error);
		}
	}

	// Keeps the CMS's own user tables in step with better-auth's.
	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		if (ctx.path === '/sign-up/email' && ctx.context.user) {
			try {
				await db.createUserProfile({ userId: ctx.context.user.id, role: 'editor' });
				cmsLogger.info('[Auth]', 'Created user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error creating user profile:', error);
			}
		}

		if (ctx.path === '/user/delete-user' && ctx.context.user) {
			try {
				await db.deleteUserProfile(ctx.context.user.id);
				cmsLogger.info('[Auth]', 'Deleted user profile');
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error deleting user profile:', error);
			}
		}
	});

	// better-auth reads `appName` as the default TOTP issuer, so it's what shows up
	// beside the code in the user's authenticator app.
	const twoFactorOptions = twoFactor === true ? {} : twoFactor || undefined;

	const base = {
		baseURL,
		secret,
		trustedOrigins,
		...(appName ? { appName } : {}),
		session: {
			// Verifies the cookie signature without a DB hit. The short maxAge keeps
			// revocation lag tight for role/membership changes, which the per-request
			// RBAC chain re-reads on top of this.
			cookieCache: { enabled: true, maxAge: 60 }
		},
		advanced: {
			backgroundTasks: {
				handler: (task: unknown) => {
					Promise.resolve(typeof task === 'function' ? task() : task).catch(() => {});
				}
			}
		},
		database: drizzleAdapter(drizzleDb as never, { provider: dialect }),
		databaseHooks: {
			user: {
				create: {
					// Invite-gating belongs here rather than on the route: this runs before
					// the row is written, so a direct POST to the sign-up endpoint is
					// rejected exactly like a form submission.
					before: async (user: { email?: string }) => {
						if (!inviteOnly) return { data: user };

						// Invitations are stored lower-cased and matched exactly, so a
						// mixed-case sign-up would otherwise find nothing and be refused.
						const address = user.email?.toLowerCase().trim();
						const invitations = address ? await db.findInvitationsByEmail(address) : [];
						const hasPendingInvite = invitations.some(
							(invitation) =>
								invitation.acceptedAt === null &&
								new Date(invitation.expiresAt).getTime() > Date.now()
						);

						if (!hasPendingInvite) {
							cmsLogger.warn('[Auth]', `Blocked sign-up for ${address} — no pending invitation`);
							throw new APIError('FORBIDDEN', {
								message: 'Sign-up is by invitation only. Ask an administrator for an invite.'
							});
						}

						return { data: user };
					}
				}
			}
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({
				user,
				token
			}: {
				user: { name?: string; email: string };
				token: string;
			}) => {
				// better-auth's default link is /reset-password?token=…; the apps route
				// the token as a path segment instead.
				const resetUrl = `${baseURL || 'http://localhost:5173'}/reset-password/${token}`;
				await sendAuthEmail('passwordReset', user.email, user.name || user.email, resetUrl);
			}
		},
		emailVerification: {
			enabled: true,
			sendOnSignUp: requireEmailVerification,
			autoSignInAfterVerification: true,
			verifyEmailPath: '/verify-email',
			sendVerificationEmail: async ({
				user,
				url
			}: {
				user: { name?: string; email: string };
				url: string;
			}) => {
				// Per-address throttle. The IP rate limit below stops scripted abuse;
				// this caps the damage once an attacker rotates IPs, so a victim's
				// inbox (and the email quota) can't be flooded.
				if (cache) {
					const throttleKey = `verify-email-throttle:${user.email.toLowerCase()}`;
					if (await cache.get<number>(throttleKey)) {
						cmsLogger.info('[Auth]', `Skipping verification email — throttled (${user.email})`);
						return;
					}
					await cache.set(throttleKey, Date.now(), VERIFICATION_EMAIL_COOLDOWN);
				}
				await sendAuthEmail('emailVerification', user.email, user.name || user.email, url);
			}
		},
		rateLimit: {
			// better-auth only rate-limits in production by default; enabled explicitly
			// so the per-endpoint rules below also apply in dev.
			enabled: true,
			window: 60,
			max: 100,
			customRules: {
				'/send-verification-email': { window: 60, max: 2 },
				'/forget-password': { window: 60, max: 2 }
			}
		},
		...(socialProviders ? { socialProviders } : {}),
		plugins: [
			apiKey({
				apiKeyHeaders: ['x-api-key'],
				deferUpdates: true,
				rateLimit: { enabled: true, timeWindow: 1000 * 60 * 60 * 24, maxRequests: 10000 },
				enableMetadata: true,
				...(cache ? buildCacheStorage(cache) : {})
			}),
			// Registered only when asked for: the plugin mounts /two-factor/* routes and
			// makes a 2FA-enabled sign-in return a challenge instead of a session, which
			// an app that hasn't built the verification screen can't complete.
			...(twoFactorOptions ? [twoFactorPlugin(twoFactorOptions)] : [])
		],
		hooks: { after: userSyncHooks }
	};

	return betterAuth(extend ? (extend(base) as typeof base) : base);
}

export type AphexAuthInstance = ReturnType<typeof createAuthInstance>;
