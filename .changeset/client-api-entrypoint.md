---
'@aphexcms/cms-core': minor
---

Add a narrow `@aphexcms/cms-core/client/api` entrypoint that exports only the
API client functions (no Svelte components). Importing anything from the main
`@aphexcms/cms-core/client` barrel pulls the entire admin UI graph — including
the TipTap rich-text editor and @dnd-kit — into that route's chunk (~1.18 MB
min / 328 kB gzip), even for a page that only calls an API function.

Non-breaking: the existing `/client` barrel is unchanged. Utility pages that
only need the API (e.g. an invitations screen, god-mode) can repoint their
import to `/client/api` to drop the editor bundle from that route:

```diff
-import { invitations, organizations } from '@aphexcms/cms-core/client';
+import { invitations, organizations } from '@aphexcms/cms-core/client/api';
```
