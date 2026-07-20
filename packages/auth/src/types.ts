import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { BetterAuthOptions } from 'better-auth';
import type { EmailAdapter, CacheAdapter, DatabaseAdapter } from '@aphexcms/cms-core/server';
import type * as pgAuthSchema from './schema/pg';

/** Rendered email payload the app's templates return. */
export interface RenderedEmail {
	html: string;
	text: string;
}

/**
 * The email pieces @aphexcms/auth needs to send auth mail. The app owns the
 * templates (Svelte components) and passes this in; the package owns the
 * *send + throttle* logic. The studio's `emailConfig` already satisfies this.
 */
export interface AuthEmailRenderers {
	from: string;
	passwordReset: {
		subject: string;
		render(userName: string, resetUrl: string): Promise<RenderedEmail>;
	};
	emailVerification: {
		subject: string;
		render(userName: string, verifyUrl: string): Promise<RenderedEmail>;
	};
}

/** App-owned auth behaviour (env-driven in the studio). */
export interface AphexAuthOptions {
	/**
	 * Require a verified email before sign-in. When enabled a verification email
	 * is sent on sign-up and sign-in is blocked until confirmed.
	 * @default false
	 */
	requireEmailVerification: boolean;
}

/**
 * The Drizzle handle the AuthService reads directly. Typed to the package's own
 * Better Auth (pg) schema so the relational `.query.user` / `.query.apikey`
 * surface is statically present. The studio hands its full cms+auth schema
 * handle, which is a width-superset and assigns without a cast. (A generic here
 * fails: drizzle can't reduce `.query`'s mapped type over an unresolved generic.)
 */
export type AuthDrizzleDb = PostgresJsDatabase<typeof pgAuthSchema>;

/** Env values the hardened instance reads. Studio passes `$env/dynamic/private`. */
export interface AphexAuthEnv {
	AUTH_SECRET?: string;
	BETTER_AUTH_SECRET?: string;
	AUTH_URL?: string;
	BETTER_AUTH_URL?: string;
	AUTH_TRUSTED_ORIGINS?: string;
}

/** App additions layered over the hardened baseline (baseline wins on conflict). */
export interface BetterAuthExtensions {
	/** Extra Better Auth plugins (social login, 2FA, …). Concatenated after api-key. */
	plugins?: NonNullable<BetterAuthOptions['plugins']>;
	/**
	 * Non-critical option overrides, spread *before* the hardened keys so the
	 * baseline (rateLimit, trustedOrigins, session, hooks, api-key) always wins.
	 */
	options?: Partial<BetterAuthOptions>;
}

export interface AphexAuthDeps {
	/** cms-core DatabaseAdapter — user-profile / org resolution. */
	db: DatabaseAdapter;
	/** Raw Drizzle handle (relational `.query` surface) for direct auth-table reads. */
	drizzleDb: AuthDrizzleDb;
	/** Matches the active driver's Better Auth drizzle backend. @default 'pg' */
	provider?: 'pg' | 'sqlite';
	/** Runtime env (secret / url / trusted-origins). */
	env: AphexAuthEnv;
	/** SvelteKit build/analyse pass — use placeholder secret/url so betterAuth() won't throw. */
	building?: boolean;
	/** Transport used to actually deliver auth mail. */
	emailAdapter?: EmailAdapter | null;
	/** App-owned template renderers + `from`. When absent, auth mail is skipped (logged). */
	emailRenderers?: AuthEmailRenderers | null;
	/** Cache adapter — api-key cache + per-email verification throttle. */
	cacheAdapter?: CacheAdapter | null;
	/** App-owned auth options. */
	options?: AphexAuthOptions;
	/** Optional app extensions layered over the hardened baseline. */
	betterAuth?: BetterAuthExtensions;
}
