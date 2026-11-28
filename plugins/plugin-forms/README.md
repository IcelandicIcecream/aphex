# @aphexcms/plugin-forms

Editor-composed forms for [AphexCMS](https://github.com/IcelandicIcecream/aphex) — contact forms, signups, surveys — built in the admin rather than in code, with submissions stored as documents.

📚 **Documentation: [docs.getaphex.com/forms](https://docs.getaphex.com/forms)**

## Install

```bash
pnpm add @aphexcms/plugin-forms
```

```ts title="src/lib/plugins.ts"
import { formsPlugin } from '@aphexcms/plugin-forms';

export const plugins = [
	formsPlugin({
		// Address notification emails come from. Falls back to APHEX_EMAIL_FROM.
		from: 'Acme <forms@example.com>'
	})
];
```

The plugin is self-contained: it registers its own schemas, its submission endpoint, its admin tool, and its notification consumer. Nothing else in `aphex.config.ts` needs to know it exists.

After adding it, regenerate types with the plugins path as the third argument, or the `form` and `formSubmission` collections stay untyped:

```bash
aphex generate:types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts ./src/lib/plugins.ts
```

## What you get

- A **form builder** in the admin — fields, labels, options, required flags, and confirmation behaviour, all editable by a non-developer.
- **Stored submissions** as ordinary documents, so they're searchable, exportable, and subject to the same access control as everything else.
- **Validation** derived from the form definition and enforced server-side, not just in the browser.
- **Spam handling** — a honeypot field plus rate limiting on the submission endpoint.
- **Email notifications** via an event consumer, so a failed send retries with backoff instead of vanishing. Replying to one answers the visitor: an empty "Reply to" means the email address they gave.
- **A confirmation for the visitor**, optional per form, in the owner's own words only. It can't carry the visitor's answers, so a stranger can't use the form to send their own text to someone else's address. It has its own consumer, so a retried notification never sends the visitor a second copy.

## Several sites, one sending address

An app that runs many sites sends from one address its mail provider has verified. Pass `site` and each site's emails carry its name in front of that address (`"Lily's Bakery" <forms@example.com>`), and a form that names nobody notifies the site's own address:

```ts
formsPlugin({
	from: 'Acme <forms@example.com>',
	// Server only. Read when a form is submitted and kept with the submission.
	site: async ({ context, localAPI }) => {
		const settings = await localAPI.collections.siteSettings.get(context);
		return { name: settings?.name, email: settings?.email };
	}
});
```

The site's email also takes replies to a visitor's confirmation. If `site` throws, the message is still stored and sent as the app.

## Submissions carry personal data

They usually contain names and email addresses, so the default access rule on `formSubmission` is deliberately stricter than on ordinary content. Widen it knowingly, and check it before exposing submissions through the HTTP or GraphQL APIs.

## Multi-tenancy

The endpoint derives the organization from the globally unique published form ID and never accepts
an organization ID from the visitor. The submission and its notification event then commit in one
transaction within that exact tenant.

## License

MIT
