/**
 * Emails about what happens to an account: a sign-in from a new device, a changed
 * password, two-factor turned off, an API key, a connected app, repeated failed
 * sign-ins. Each carries a "This wasn't me" link, which `secureAccount` answers.
 *
 * Sent directly, not through the job queue: jobs belong to an organization and need a
 * worker running, and these have to reach someone with neither. Nothing here is awaited
 * by the request, and nothing here can fail one.
 */
import { createAuthMiddleware, isAPIError } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { cmsLogger, describeDevice } from '@aphexcms/cms-core';
import type { CacheAdapter, EmailAdapter } from '@aphexcms/cms-core/server';
import { defaultSecurityEmail } from './email/security.js';
import type { AuthEmailConfig, SecurityEmailKind, SecurityEmailNotice } from './types.js';

/** 400 days: the longest a browser keeps a cookie. */
const KNOWN_DEVICE_MAX_AGE = 400 * 24 * 60 * 60;
/** People sharing one browser. The oldest is dropped. */
const MAX_PEOPLE_PER_DEVICE = 8;
/** A first sign-in this soon after signing up (say, once the address is confirmed) is the owner. */
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAILED_SIGN_INS = 5;
const FAILED_WINDOW_SECONDS = 60 * 60;
const FAILED_EMAIL_EVERY_SECONDS = 24 * 60 * 60;
const RETRY_DELAYS_MS = [2_000, 15_000];

export interface SecurityUser {
	id: string;
	email: string;
	name?: string | null;
	createdAt?: Date | string;
}

interface Verification {
	value: string;
	expiresAt: Date;
}

/** The slice of better-auth's built context this needs. */
export interface SecurityContext {
	secret: string;
	password: { hash(password: string): Promise<string> };
	adapter: {
		deleteMany(input: {
			model: string;
			where: Array<{ field: string; value: string }>;
		}): Promise<unknown>;
		findOne(input: {
			model: string;
			where: Array<{ field: string; value: string }>;
		}): Promise<unknown>;
	};
	internalAdapter: {
		createVerificationValue(data: {
			identifier: string;
			value: string;
			expiresAt: Date;
		}): Promise<unknown>;
		consumeVerificationValue(identifier: string): Promise<Verification | null>;
		deleteUserSessions(userId: string): Promise<unknown>;
		updatePassword(userId: string, password: string): Promise<unknown>;
		findAccounts(userId: string): Promise<Array<{ providerId: string; password?: string | null }>>;
		findUserById(userId: string): Promise<SecurityUser | null>;
		findUserByEmail(email: string): Promise<{ user: SecurityUser } | null>;
	};
}

export interface SecurityDeps {
	enabled: boolean;
	baseURL: string | undefined;
	authPagesPath: string;
	emailAdapter: EmailAdapter | null | undefined;
	email: AuthEmailConfig | null | undefined;
	cache: CacheAdapter | null | undefined;
	/** The country header is believed only where Cloudflare writes it. */
	ipAddressHeaders: readonly string[];
	context: () => Promise<SecurityContext>;
}

async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Buffer.from(digest).toString('base64url');
}

function randomToken(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

const linkIdentifier = async (token: string) => `aphex-secure-account:${await sha256(token)}`;

function countryName(code: string | null | undefined): string | null {
	// XX and T1 are Cloudflare's "unknown" and "Tor".
	if (!code || !/^[A-Z]{2}$/.test(code) || code === 'XX') return null;
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? null;
	} catch {
		return null;
	}
}

/** One field of something whose type isn't known, such as an endpoint's body. */
function field(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

export function createSecurityEmails(deps: SecurityDeps) {
	// Without a shared cache, counts are per process.
	const local = new Map<string, { value: number; until: number }>();
	const counter = {
		async get(key: string): Promise<number> {
			if (deps.cache) return (await deps.cache.get<number>(key)) ?? 0;
			const entry = local.get(key);
			return entry && entry.until > Date.now() ? entry.value : 0;
		},
		async set(key: string, value: number, ttlSeconds: number): Promise<void> {
			if (deps.cache) {
				await deps.cache.set(key, value, ttlSeconds);
				return;
			}
			if (local.size > 10_000) local.clear();
			local.set(key, { value, until: Date.now() + ttlSeconds * 1000 });
		}
	};

	async function deliver(user: SecurityUser, notice: Omit<SecurityEmailNotice, 'url'>) {
		const from = deps.email?.from ?? deps.emailAdapter?.defaultFrom;
		if (!deps.emailAdapter || !from) {
			cmsLogger.warn(
				'[Auth]',
				`Security email (${notice.kind}) not sent: no email adapter or sender.`
			);
			return;
		}
		const token = randomToken();
		const { internalAdapter } = await deps.context();
		await internalAdapter.createVerificationValue({
			identifier: await linkIdentifier(token),
			value: user.id,
			expiresAt: new Date(Date.now() + LINK_TTL_MS)
		});
		const url = `${deps.baseURL ?? 'http://localhost:5173'}${deps.authPagesPath}/secure-account/${token}`;
		const template = deps.email?.security ?? defaultSecurityEmail;
		const { subject, html, text } = await template.render({ ...notice, url });

		for (let attempt = 0; ; attempt++) {
			let failure: unknown;
			try {
				const result = await deps.emailAdapter.send({ from, to: user.email, subject, html, text });
				if (!result.error) return;
				failure = result.error;
			} catch (error) {
				failure = error;
			}
			const delay = RETRY_DELAYS_MS[attempt];
			if (delay === undefined) {
				cmsLogger.error('[Auth]', `Failed to send ${notice.kind} email:`, failure);
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	/** Tell the account's owner. Returns at once; sending carries on behind it. */
	function notify(
		user: SecurityUser,
		kind: SecurityEmailKind,
		detail: { headers?: Headers | null; name?: string | null } = {}
	): void {
		if (!deps.enabled) return;
		const { headers } = detail;
		const country = deps.ipAddressHeaders.some((h) => h.toLowerCase() === 'cf-connecting-ip')
			? countryName(headers?.get('cf-ipcountry'))
			: null;
		deliver(user, {
			kind,
			userName: user.name || user.email,
			at: new Date(),
			device: describeDevice(headers?.get('user-agent')),
			country,
			name: detail.name ?? null
		}).catch((error) => cmsLogger.error('[Auth]', `Error sending ${kind} email:`, error));
	}

	async function failedSignIn(email: string, headers: Headers | undefined) {
		const { internalAdapter } = await deps.context();
		const found = await internalAdapter.findUserByEmail(email.toLowerCase());
		if (!found) return;
		const key = `failed-sign-ins:${found.user.id}`;
		const count = (await counter.get(key)) + 1;
		await counter.set(key, count, FAILED_WINDOW_SECONDS);
		if (count < FAILED_SIGN_INS) return;
		const sentKey = `failed-sign-ins-email:${found.user.id}`;
		if (await counter.get(sentKey)) return;
		await counter.set(sentKey, 1, FAILED_EMAIL_EVERY_SECONDS);
		notify(found.user, 'failed-sign-ins', { headers });
	}

	/** Last in the plugin list: two-factor's own hook has then withdrawn a session that still needs a code. */
	const plugin = {
		id: 'aphex-security-emails',
		hooks: {
			after: [
				{
					matcher: () => deps.enabled,
					handler: createAuthMiddleware(async (ctx) => {
						try {
							const { path, headers } = ctx;
							const returned: unknown = ctx.context.returned;
							if (isAPIError(returned)) {
								const email = field(ctx.body, 'email');
								if (
									path === '/sign-in/email' &&
									field(returned.body, 'code') === 'INVALID_EMAIL_OR_PASSWORD' &&
									typeof email === 'string'
								) {
									failedSignIn(email, headers).catch((error) =>
										cmsLogger.error('[Auth]', 'Error counting failed sign-ins:', error)
									);
								}
								return;
							}

							const signedIn = ctx.context.session?.user;
							if (signedIn) {
								if (path === '/change-password') notify(signedIn, 'password-changed', { headers });
								if (path === '/two-factor/disable')
									notify(signedIn, 'two-factor-disabled', { headers });
								if (path === '/oauth2/consent' && field(ctx.body, 'accept') === true) {
									const query = field(ctx.body, 'oauth_query');
									const clientId =
										typeof query === 'string' ? new URLSearchParams(query).get('client_id') : null;
									const client = clientId
										? await (
												await deps.context()
											).adapter.findOne({
												model: 'oauthClient',
												where: [{ field: 'clientId', value: clientId }]
											})
										: null;
									const name = field(client, 'name');
									notify(signedIn, 'app-connected', {
										headers,
										name: typeof name === 'string' ? name : null
									});
								}
								// Any other session a signed-in request makes replaces the one it had.
								return;
							}

							const created = ctx.context.newSession;
							if (!created) return;
							const { user } = created;
							const cookie = ctx.context.createAuthCookie('known_device', {
								maxAge: KNOWN_DEVICE_MAX_AGE
							});
							const people = (await ctx.getSignedCookie(cookie.name, ctx.context.secret)) || '';
							const known = people.split('~').filter(Boolean);
							const person = await sha256(`${ctx.context.secret}:known-device:${user.id}`);
							// Re-written on every sign-in, so a device in use never lapses.
							await ctx.setSignedCookie(
								cookie.name,
								[person, ...known.filter((id) => id !== person)]
									.slice(0, MAX_PEOPLE_PER_DEVICE)
									.join('~'),
								ctx.context.secret,
								cookie.attributes
							);
							if (known.includes(person)) return;
							if (path.startsWith('/sign-up/')) return;
							if (Date.now() - new Date(user.createdAt).getTime() < NEW_ACCOUNT_MS) {
								const sessions = await ctx.context.internalAdapter.listSessions(user.id);
								if (sessions.every((session) => session.token === created.session.token)) return;
							}
							notify(user, 'new-device', { headers });
						} catch (error) {
							cmsLogger.error('[Auth]', 'Security email check failed:', error);
						}
					})
				}
			]
		}
	} satisfies BetterAuthPlugin;

	/**
	 * Answer "This wasn't me": sign out every device, make the old password useless and
	 * withdraw anything pending (reset links, trusted devices). Whether there's a password
	 * to reset is the caller's cue to email a reset link.
	 */
	async function secureAccount(
		token: string
	): Promise<{ user: SecurityUser; hasPassword: boolean } | null> {
		if (!deps.enabled) return null;
		const context = await deps.context();
		const row = await context.internalAdapter.consumeVerificationValue(await linkIdentifier(token));
		if (!row) return null;
		const userId = row.value;
		const user = await context.internalAdapter.findUserById(userId);
		if (!user) return null;

		const accounts = await context.internalAdapter.findAccounts(userId);
		const hasPassword = accounts.some((account) => account.providerId === 'credential');
		// The password first: signing out alone lets whoever knows it straight back in.
		if (hasPassword) {
			await context.internalAdapter.updatePassword(
				userId,
				await context.password.hash(randomToken())
			);
		}
		await context.adapter.deleteMany({
			model: 'verification',
			where: [{ field: 'value', value: userId }]
		});
		await context.internalAdapter.deleteUserSessions(userId);
		return { user, hasPassword };
	}

	return { notify, plugin, secureAccount };
}

export type SecurityEmails = ReturnType<typeof createSecurityEmails>;
