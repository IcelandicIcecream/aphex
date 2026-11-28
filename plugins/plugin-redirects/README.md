# @aphexcms/plugin-redirects

Old addresses keep working. When a published page or post changes its address, the
old one redirects to the new one by itself, and so does everything under a section
(a blog) that moves. A **Redirects** screen lists them all, with how often each is
used, and takes your own for a site you're moving from. The site's AI can list, add
and remove them too.

Everything is kept in Aphex's plugin storage: no tables, no migration, and each
organization's redirects are its own.

## Use

```ts
import { redirectsPlugin } from '@aphexcms/plugin-redirects';

redirectsPlugin({
	// Where each type's published documents are served. Types not listed get no
	// automatic redirects.
	addresses: {
		page: (doc) => (doc.slug === 'home' ? '/' : `/${doc.slug}`),
		post: (doc, { sections }) => `${sections.blog}/${doc.slug}`
	},
	// An address prefix a document owns: here a blog whose address is a setting.
	sections: {
		blog: { type: 'siteSettings', path: (doc) => `/${doc.blogPath || 'blog'}`, initial: '/blog' }
	}
});
```

Following a redirect is the site's: when a path finds nothing, ask for one and send
the visitor on with a 301.

```ts
import { findRedirect, normalizePath } from '@aphexcms/plugin-redirects';

const path = normalizePath(url.pathname);
const target = path && (await findRedirect(cms.databaseAdapter, organizationId, path));
if (target) redirect(301, target);
```

Ask only for a 404, so a live page always wins and normal pages cost nothing. A
lookup is a handful of index reads however many redirects there are.

## What it adds

- a consumer of `document.published` that records address changes
- the Redirects admin screen (`placement: 'sidebar'`; pass `group` to place it)
- `GET`, `POST` and `DELETE /api/redirects` (read: `document.read`, change: `document.update`)
- the agent tools `list_redirects`, `add_redirect` and `remove_redirect`
