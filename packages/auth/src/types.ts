import type { BetterAuthOptions } from 'better-auth';
import type { TwoFactorOptions } from 'better-auth/plugins';
import type {
	BootstrapPolicy,
	CacheAdapter,
	DatabaseAdapter,
	EmailAdapter
} from '@aphexcms/cms-core/server';

/**
 * One transactional email the auth flows can send. Deliberately structural
 * rather than a concrete class: apps render these with their own Svelte
 * components and branding, so the package only needs the two things it
 * actually calls.
 */
export interface AuthEmailTemplate {
	subject: string;
	render: (userName: string, url: string) => Promise<{ html: string; text: string }>;
}

/**
 * Like `AuthEmailTemplate`, but the second argument is a short code the reader
 * types back into a page rather than a link they click. Structurally identical,
 * named apart so a template can't be wired into the wrong slot and silently mail
 * a URL where a six-digit code belongs.
 */
export interface AuthCodeEmailTemplate {
	subject: string;
	render: (userName: string, code: string) => Promise<{ html: string; text: string }>;
}

/**
 * Sender identity plus the templates the auth flows use. Mirrors the shape apps
 * already export from `src/lib/server/email` — pass that object straight in.
 */
export interface AuthEmailConfig {
	from: string;
	passwordReset: AuthEmailTemplate;
	emailVerification: AuthEmailTemplate;
	/**
	 * Branding for the second-factor code email. Optional — when omitted, a plain
	 * built-in template is used instead, so email 2FA works without writing one.
	 * Whether the feature is on at all is `options.twoFactorEmailOtp`, not this.
	 */
	twoFactorOtp?: AuthCodeEmailTemplate;
}

/** Behavioural toggles an app owns, independent of the auth provider. */
export interface AuthOptions {
	/**
	 * Require a verified email before sign-in. When on, a verification email is
	 * sent at sign-up and sign-in is blocked until the address is confirmed.
	 *
	 * Off by default so a fresh install works without an SMTP server. Turn it on
	 * in production — without it anyone can sign up with an address they don't
	 * own, and the first user becomes super admin.
	 *
	 * @default false
	 */
	requireEmailVerification?: boolean;

	/**
	 * Which second factors the sign-in challenge offers.
	 *
	 * - `'totp'` — a rotating code from an authenticator app.
	 * - `'email'` — a one-time code mailed on request. Needs an email adapter;
	 *   without one it is dropped regardless, because a factor that can't be
	 *   delivered locks people out of their own accounts. Branding is optional —
	 *   supply `email.twoFactorOtp` or accept the plain built-in template.
	 *
	 * Backup codes are always available and aren't listed here: better-auth mints
	 * them when 2FA is enabled and they're the recovery path when every other
	 * factor is unreachable, so switching them off would only create lockouts.
	 *
	 * Dropping `'totp'` makes email the only factor, which also means enrolment
	 * no longer shows a QR code — users turn 2FA on and codes simply arrive.
	 * Convenient, and weaker: whoever holds the password and the inbox gets
	 * through, and password resets go to that same inbox.
	 *
	 * An empty array is treated as `['totp']` — zero factors would mean 2FA that
	 * can be enabled but never satisfied.
	 *
	 * @default ['totp', 'email']
	 */
	twoFactorMethods?: Array<'totp' | 'email'>;

	/**
	 * Restrict account creation to addresses holding a pending, unexpired
	 * invitation. Gates the sign-up *endpoint*, so a direct POST is rejected the
	 * same as a form submission.
	 *
	 * Note this is not better-auth's `disableSignUp`: an invitee has to create an
	 * account before they can accept an invitation, so disabling sign-up outright
	 * makes invitations impossible to accept.
	 *
	 * On by default, with one exception: sign-up is always allowed while the
	 * instance is provably empty, since nobody exists yet to send an invitation.
	 * So a fresh install is "first person to sign up owns it, and the door shuts
	 * behind them" — open exactly long enough to be claimed.
	 *
	 * That leaves one window: an instance reachable *before* you claim it belongs
	 * to whoever finds it first. Close it with a `bootstrap` recipe (`claimCode`,
	 * `allowlistEmail`) rather than by turning this off.
	 *
	 * @default true
	 */
	inviteOnly?: boolean;
}

/**
 * Everything `createAphexAuth` needs.
 *
 * Nothing here is read from the environment: a package can't use SvelteKit's
 * `$env/dynamic/private`, and hiding env lookups inside a dependency makes
 * misconfiguration hard to trace. The app reads its own env and passes values in.
 */
export interface AphexAuthConfig {
	/** The CMS database adapter — used to keep `cms_user_profiles` in sync. */
	database: DatabaseAdapter;

	/**
	 * The raw Drizzle client better-auth's own adapter writes through. Typed
	 * loosely on purpose: this is the one place a Postgres and a libsql Drizzle
	 * instance have to be interchangeable, and they share no common base type.
	 */
	drizzleDb: unknown;

	/** Which Drizzle dialect `drizzleDb` is. postgres/pglite → 'pg', libsql → 'sqlite'. */
	dialect: 'pg' | 'sqlite';

	/** Signing secret. Required at runtime; a placeholder is used while `building`. */
	secret?: string;

	/** Public origin, e.g. `https://cms.example.com`. Used for links in emails. */
	baseURL?: string;

	/**
	 * Origins allowed to make cross-origin auth requests. Without this, cookie-auth
	 * mutations are reachable from any site a signed-in admin visits. Defaults to
	 * `baseURL`.
	 */
	trustedOrigins?: string[];

	/** True during SvelteKit's build/analyse pass, when placeholders stand in for secrets. */
	building?: boolean;

	/** Transport for outbound mail. `null` disables password reset and verification emails. */
	emailAdapter?: EmailAdapter | null;

	/** Sender identity and templates. Omit alongside `emailAdapter` to disable email. */
	email?: AuthEmailConfig | null;

	/** Backs session-cookie caching and the verification-email throttle. */
	cache?: CacheAdapter | null;

	/** App-owned behavioural toggles. */
	options?: AuthOptions;

	/**
	 * How a fresh instance gets its first administrator.
	 *
	 * Defaults to `openFirstUser()`: the first person to sign up owns the
	 * instance, the same as WordPress, Ghost, Strapi, Payload and Dokploy. That
	 * assumes you sign up promptly after deploying — an instance left reachable
	 * beforehand belongs to whoever finds it.
	 *
	 * Harden it with `claimCode()`, which additionally requires a code printed to
	 * the server log at startup so being first to the URL isn't enough, or with
	 * `allowlistEmail()`; `never()` turns promotion off entirely.
	 *
	 * ```ts
	 * import { allowlistEmail } from '@aphexcms/auth';
	 * bootstrap: allowlistEmail(env.APHEX_BOOTSTRAP_EMAIL)
	 * ```
	 */
	bootstrap?: BootstrapPolicy;

	/**
	 * OAuth / social sign-in, passed straight through to better-auth. No schema
	 * change needed — provider links live in the existing `account` table.
	 *
	 * ```ts
	 * socialProviders: {
	 *   google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
	 * }
	 * ```
	 *
	 * Typed straight off better-auth rather than restated here, so provider names
	 * and their option shapes can't drift out of step with the installed version.
	 */
	socialProviders?: BetterAuthOptions['socialProviders'];

	/**
	 * Two-factor authentication via an authenticator app (TOTP), plus backup codes.
	 * Off unless set — `true` takes better-auth's defaults, an object configures it.
	 *
	 * The tables are in the schema either way, so turning this on is a config change
	 * rather than a migration.
	 *
	 * ```ts
	 * twoFactor: true
	 * twoFactor: { issuer: 'Acme CMS', totpOptions: { period: 30 } }
	 * ```
	 *
	 * Enrolling and verifying is driven from the client — add `twoFactorClient()` to
	 * your better-auth client and call `twoFactor.enable` / `verifyTotp`.
	 */
	twoFactor?: boolean | TwoFactorOptions;

	/**
	 * Shown as the issuer in authenticator apps when `twoFactor` is on, so make it
	 * something a user will recognise next to a 6-digit code. Defaults to
	 * better-auth's own fallback ("Better Auth") — override it.
	 */
	appName?: string;

	/**
	 * Full escape hatch. Receives the assembled better-auth options and returns
	 * what should actually be passed to `betterAuth()`.
	 *
	 * This exists so the wrapper never becomes a ceiling: better-auth is a peer
	 * dependency, so you choose its version, and any option it gains — new
	 * plugins, new providers — is reachable here without waiting on a release of
	 * this package.
	 *
	 * ```ts
	 * betterAuth: (base) => ({ ...base, plugins: [...base.plugins, twoFactor()] })
	 * ```
	 */
	betterAuth?: (base: Record<string, unknown>) => Record<string, unknown>;
}
