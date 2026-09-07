# @aphexcms/nodemailer-adapter

SMTP email adapter for [AphexCMS](https://github.com/IcelandicIcecream/aphex), built on [Nodemailer](https://nodemailer.com).

Implements the `EmailAdapter` contract from `@aphexcms/cms-core`. Aphex uses it for password resets, email verification, and organization invitations — and any plugin or job that sends mail.

Prefer `@aphexcms/resend-adapter` in production unless you have an SMTP server you want to use.

## Install

```bash
pnpm add @aphexcms/nodemailer-adapter
```

## Quick start

```ts title="src/lib/server/email/index.ts"
import { createNodemailerAdapter } from '@aphexcms/nodemailer-adapter';

export const email = createNodemailerAdapter({
	host: env.SMTP_HOST,
	port: Number(env.SMTP_PORT),
	auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
});
```

```ts title="aphex.config.ts"
export default createCMSConfig({
	schemaTypes,
	database: db,
	email
});
```

## Local development with Mailpit

`createMailpitAdapter()` is the same adapter pre-pointed at Mailpit on `localhost:1025`, so mail you send in development is captured instead of delivered — read it at `http://localhost:8025`.

```ts
import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';

export const email = dev ? createMailpitAdapter() : createNodemailerAdapter({ ... });
```

`pnpm db:start` in the Aphex monorepo brings Mailpit up alongside Postgres.

## Email verification is off by default

A fresh Aphex project doesn't require verification, so the first account can sign in with no mail server at all. Turn it on with `AUTH_REQUIRE_EMAIL_VERIFICATION=true` once you have an adapter configured — recommended in production, since without it anyone can sign up with an address they don't own.

## License

MIT
