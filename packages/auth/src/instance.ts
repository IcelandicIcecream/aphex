import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { cmsLogger, emitUserDeleted } from '@aphexcms/cms-core';
import {
	assertAccountDeletable,
	assertSignUpAllowed,
	AccountDeletionBlockedError,
	createUserProfileWithBootstrap,
	detachUserFromOrganizations,
	SignUpBlockedError,
	type CacheAdapter
} from '@aphexcms/cms-core/server';
import { resolveBootstrapPolicy } from './bootstrap-policy.js';
import type { AphexAuthConfig } from './types.js';
import { defaultTwoFactorOtpEmail } from './email/two-factor-otp.js';

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

	const {
		requireEmailVerification = false,
		inviteOnly = true,
		allowAccountDeletion = false,
		twoFactorMethods = ['totp', 'email']
	} = config.options ?? {};

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
		template: 'passwordReset' | 'emailVerification' | 'twoFactorOtp',
		to: string,
		userName: string,
		// A link for the first two templates, a six-digit code for `twoFactorOtp`.
		url: string
	) {
		if (!emailAdapter || !emailConfig) {
			cmsLogger.warn('[Auth]', `Email adapter not configured. ${template} email not sent.`);
			return;
		}
		// Only the OTP template has a built-in fallback — the other two carry links
		// into app-specific routes, so there is nothing generic to send for them.
		const resolved =
			emailConfig[template] ?? (template === 'twoFactorOtp' ? defaultTwoFactorOtpEmail : undefined);
		if (!resolved) {
			cmsLogger.warn('[Auth]', `No ${template} email template configured. Email not sent.`);
			return;
		}
		try {
			const { subject, render } = resolved;
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

	const bootstrapPolicy = resolveBootstrapPolicy(config.bootstrap);

	// Keeps the CMS's own user tables in step with better-auth's.
	const userSyncHooks = createAuthMiddleware(async (ctx) => {
		if (ctx.path === '/sign-up/email' && ctx.context.user) {
			try {
				// Routed through the shared helper rather than writing the row here.
				// This used to insert a hard-coded `role: 'editor'`, which quietly
				// disabled the entire bootstrap policy: `AuthService.getSession` only
				// runs `createUserProfileWithBootstrap` when no profile exists, so a row
				// written at sign-up meant `openFirstUser`, `claimCode` and
				// `allowlistEmail` never got to promote anyone — a fresh instance ended
				// up with no administrator at all.
				//
				// Creating it *here* rather than leaving it to that lazy sync also keeps
				// the profile row — which is what `isInstanceEmpty` counts — in place
				// from the moment the account exists. Deferring it would leave the
				// instance reading as empty until the new user's first page load, and
				// `assertSignUpAllowed` treats an empty instance as the one case where
				// invite-only doesn't apply.
				await createUserProfileWithBootstrap({
					db,
					user: {
						id: ctx.context.user.id,
						email: ctx.context.user.email,
						emailVerified: ctx.context.user.emailVerified === true
					},
					request: ctx.request,
					bootstrap: bootstrapPolicy
				});
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error creating user profile:', error);
			}
		}

		// better-auth mounts this as `/delete-user`, not `/user/delete-user`.
		if (ctx.path === '/delete-user' && ctx.context.user) {
			const deleted = ctx.context.user;
			try {
				// Memberships are read first: deleting the profile is what removes them, and
				// after that there's nothing left to say which organizations this account
				// left data in.
				const memberships = await db.findUserOrganizations(deleted.id);
				const organizationIds = memberships.map((m) => m.organization.id);

				// One transaction, so the erasure events can't go missing for an account
				// that is already gone. That's the whole point of the outbox here: after
				// this commits, the only remaining pointer to the user's avatar is the
				// event, and a consumer will act on it even if this process dies now.
				await db.withTransaction(async (tx) => {
					await emitUserDeleted(tx, organizationIds, {
						id: deleted.id,
						email: deleted.email,
						image: deleted.image
					});
					// Memberships don't cascade — `cms_organization_members.user_id` points
					// at the auth layer's user, which cms-core doesn't own — so without this
					// a deleted account keeps showing up in member lists holding its old role.
					await detachUserFromOrganizations(tx, deleted.id, organizationIds);
					await tx.deleteUserProfile(deleted.id);
				});
				cmsLogger.info('[Auth]', `Deleted user profile and queued erasure for ${deleted.id}`);
			} catch (error) {
				cmsLogger.error('[Auth]', 'Error deleting user profile:', error);
			}
		}
	});

	/**
	 * Closes better-auth's own API-key endpoints to the network.
	 *
	 * The api-key plugin mounts `/api-key/create`, `/update`, `/delete` and
	 * `/list` under the auth handler, and the CMS auth hook lets everything under
	 * `/api/auth` through untouched so better-auth can own its own routes. That
	 * combination meant any signed-in user — a viewer included — could mint or
	 * revoke keys by POSTing directly, bypassing the `apiKey.manage` capability
	 * check on the CMS's `/api/settings/api-keys` route, and could write whatever
	 * they liked into the client-writable metadata.
	 *
	 * `ctx.request` is only populated when a call arrived over HTTP; the CMS's own
	 * server-side `auth.api.createApiKey` / `verifyApiKey` calls pass just a body,
	 * so they keep working. That makes the CMS route the single authorized way in,
	 * which is where the capability check and the org binding already live.
	 */
	const blockDirectApiKeyEndpoints = createAuthMiddleware(async (ctx) => {
		if (ctx.path.startsWith('/api-key/') && ctx.request) {
			throw new APIError('NOT_FOUND', {
				message: 'API keys are managed through the CMS, not through the auth endpoint.'
			});
		}
	});

	// better-auth reads `appName` as the default TOTP issuer, so it's what shows up
	// beside the code in the user's authenticator app.
	// Defaults to `{}` rather than `undefined` on purpose: the plugin is registered
	// unconditionally (see the tuple note below), so `config.twoFactor` being unset
	// means "take the defaults", not "no 2FA". Gating anything on its presence
	// would skip that wiring for every app that never wrote a `twoFactor` block —
	// which is most of them, since 2FA works without one.
	const baseTwoFactorOptions = twoFactor === true || !twoFactor ? {} : twoFactor;

	/**
	 * Email delivery for the OTP second factor.
	 *
	 * Gated on the flag *and* on there being somewhere to send mail, because
	 * better-auth advertises `otp` in `twoFactorMethods` purely from whether
	 * `sendOTP` exists. Registering one that can't deliver would show users an
	 * "email me a code" button leading to a code that never arrives — the one
	 * failure mode that locks someone out of their own account.
	 *
	 * An explicit `otpOptions` in the app's config still wins, so this is a
	 * default rather than a ceiling.
	 */
	const wantsEmailOtp = twoFactorMethods.includes('email');
	const canSendOtpEmail = wantsEmailOtp && Boolean(emailAdapter && emailConfig);
	if (wantsEmailOtp && !canSendOtpEmail && !building) {
		cmsLogger.warn(
			'[Auth]',
			"twoFactorMethods includes 'email' but no email adapter is configured — email codes are unavailable."
		);
	}

	// Falling back rather than honouring an empty list: a user who enabled 2FA
	// against a config that offers nothing could never sign in again.
	const offersTotp = twoFactorMethods.includes('totp') || !canSendOtpEmail;

	const twoFactorOptions = {
		...baseTwoFactorOptions,
		// Enrolment normally ends with the user proving they scanned the QR. With
		// no authenticator in the picture there is nothing to prove, so enabling
		// has to complete on its own or 2FA could never be turned on at all.
		...(offersTotp ? {} : { skipVerificationOnEnable: true }),
		...(canSendOtpEmail && !baseTwoFactorOptions.otpOptions
			? {
					otpOptions: {
						async sendOTP({ user, otp }: { user: { name?: string; email: string }; otp: string }) {
							await sendAuthEmail('twoFactorOtp', user.email, user.name || user.email, otp);
						}
					}
				}
			: {})
	};

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
		// Opt-in: mounting `/delete-user` makes account deletion reachable over HTTP for
		// anyone holding a session, and it's irreversible. The `user.deleted` erasure
		// events below only ever fire through this endpoint, so an app that wants
		// right-to-erasure has to turn it on deliberately.
		...(allowAccountDeletion
			? {
					user: {
						deleteUser: {
							enabled: true,
							// Runs before better-auth touches the user row, so refusing here
							// leaves the account fully intact. The rule itself lives in
							// cms-core so it holds for any provider.
							beforeDelete: async (user: { id: string }) => {
								try {
									await assertAccountDeletable(db, user.id);
								} catch (error) {
									if (error instanceof AccountDeletionBlockedError) {
										throw new APIError('BAD_REQUEST', { message: error.message });
									}
									throw error;
								}
							}
						}
					}
				}
			: {}),
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
					// The rule itself lives in cms-core so every AuthProvider enforces the
					// same one. This hook only supplies Better Auth's lifecycle and error
					// type — running *before* the row is written, so a direct POST to the
					// sign-up endpoint is rejected exactly like a form submission.
					before: async (user: { email?: string }) => {
						try {
							await assertSignUpAllowed({ db, email: user.email, inviteOnly });
						} catch (error) {
							if (error instanceof SignUpBlockedError) {
								throw new APIError('FORBIDDEN', { message: error.message });
							}
							throw error;
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
				// The endpoint is `/request-password-reset`; `/forget-password` is the
				// legacy alias. Keying only on the alias — as this did — left the real
				// endpoint on the generic 100/minute allowance, which is no throttle at
				// all for an email-sending route.
				'/request-password-reset': { window: 60, max: 2 },
				'/forget-password': { window: 60, max: 2 }
			}
		},
		...(socialProviders ? { socialProviders } : {}),
		hooks: { before: blockDirectApiKeyEndpoints, after: userSyncHooks }
	};

	const apiKeyPlugin = apiKey({
		apiKeyHeaders: ['x-api-key'],
		deferUpdates: true,
		rateLimit: { enabled: true, timeWindow: 1000 * 60 * 60 * 24, maxRequests: 10000 },
		enableMetadata: true,
		...(cache ? buildCacheStorage(cache) : {})
	});

	// One call with a fixed plugin tuple, deliberately. better-auth derives the
	// whole `auth.api.*` surface from the exact tuple it's given: a conditional
	// spread widens it to `(A | B)[]`, and branching into two calls makes the
	// return type a union — both erase the typed endpoints, so `deleteApiKey()`
	// degrades to a bare `Response` and callers lose `.success`.
	//
	// So the 2FA plugin is always registered, and `config.twoFactor` decides its
	// options rather than its presence. Mounting /two-factor/* costs nothing on
	// its own: the behaviour that needs a verification screen only engages for a
	// user who has *enabled* 2FA, which requires the app to have built that UI to
	// call `twoFactor.enable` in the first place.
	const options = {
		...base,
		plugins: [apiKeyPlugin, twoFactorPlugin(twoFactorOptions ?? {})]
	};

	return betterAuth(extend ? (extend(options) as typeof options) : options);
}

export type AphexAuthInstance = ReturnType<typeof createAuthInstance>;
