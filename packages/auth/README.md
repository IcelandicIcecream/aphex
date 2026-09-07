# @aphexcms/auth

[Better Auth](https://better-auth.com) wiring for [AphexCMS](https://github.com/IcelandicIcecream/aphex), in one call.

Aphex is auth-agnostic — `cms-core` defines an `AuthProvider` port and doesn't care what implements it. This package is the batteries-included implementation: sessions, organizations, invitations, API keys, two-factor, and the email flows, already mapped onto Aphex's capability model.

📚 **Documentation: [docs.getaphex.com/authentication](https://docs.getaphex.com/authentication)**

## Install

```bash
pnpm add @aphexcms/auth better-auth @better-auth/api-key
```

## Quick start

```ts title="src/lib/server/auth/index.ts"
import { createAphexAuth } from '@aphexcms/auth';
import { db, drizzleDb, dbDialect } from '$lib/server/db';
import { email } from '$lib/server/email';

export const {
	auth,
	service: authService,
	provider: authProvider
} = createAphexAuth({
	database: db,
	drizzleDb,
	dialect: dbDialect,
	secret: env.AUTH_SECRET,
	baseURL: env.AUTH_URL,
	trustedOrigins: [env.AUTH_URL],
	emailAdapter: email,
	appName: 'My CMS'
});
```

`provider` is what `createCMSConfig()` wants:

```ts title="aphex.config.ts"
export default createCMSConfig({
	schemaTypes,
	database: db,
	auth: { provider: authProvider, loginUrl: '/login' }
});
```

## Environment

```bash
AUTH_SECRET=            # node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
AUTH_URL=http://localhost:5173
AUTH_TRUSTED_ORIGINS=http://localhost:5173
```

`BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` still work as aliases, but prefer the `AUTH_*` spellings.

Rotating `AUTH_SECRET` signs everyone out and invalidates every API key, so generate one per environment and keep it.

`AUTH_TRUSTED_ORIGINS` is not optional in production: Better Auth uses it for CSRF and origin checks, and without it cookie-authenticated mutations are reachable from any site a signed-in admin visits.

## Schema

Auth tables are dialect-specific and exported separately, because Drizzle needs the real table objects:

```ts
import * as authSchema from '@aphexcms/auth/schema/pg'; // or /schema/sqlite
```

## Email verification is off by default

The first user to sign up becomes super admin and can sign in immediately, with no SMTP server — which is what makes a fresh project runnable in one command. Turn verification on with `AUTH_REQUIRE_EMAIL_VERIFICATION=true` once you have an email adapter configured. In production you want it on: without it, anyone can sign up with an address they don't own.

## License

MIT
