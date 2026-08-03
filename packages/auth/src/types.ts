import type { CacheAdapter, DatabaseAdapter, EmailAdapter } from '@aphexcms/cms-core/server';

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
 * Sender identity plus the templates the auth flows use. Mirrors the shape apps
 * already export from `src/lib/server/email` — pass that object straight in.
 */
export interface AuthEmailConfig {
	from: string;
	passwordReset: AuthEmailTemplate;
	emailVerification: AuthEmailTemplate;
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
	 * Restrict account creation to addresses holding a pending, unexpired
	 * invitation. Gates the sign-up *endpoint*, so a direct POST is rejected the
	 * same as a form submission.
	 *
	 * Note this is not better-auth's `disableSignUp`: an invitee has to create an
	 * account before they can accept an invitation, so disabling sign-up outright
	 * makes invitations impossible to accept.
	 *
	 * No bootstrap exception — with an empty user table nobody can sign up and
	 * nobody exists to invite. Create the first admin before enabling it.
	 *
	 * @default false
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
	 * OAuth / social sign-in, passed straight through to better-auth. No schema
	 * change needed — provider links live in the existing `account` table.
	 *
	 * ```ts
	 * socialProviders: {
	 *   google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
	 * }
	 * ```
	 */
	socialProviders?: Record<string, unknown>;

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
