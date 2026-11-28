---
'@aphexcms/cms-core': patch
---

A site's parameter route no longer takes `/api`, `/media` or `/.well-known` from core. An app with a page at `[school]/[personality]` (or a `[...rest]` catch-all) matched `/api/organizations`, so once the old `/api/[...slug]` route was deleted the admin's API answered with that page. Core now gives way only to a route of the app's own under the same prefix, such as `/api/orders` or a kept `/api/[...slug]`, as it already did for `/mcp`.
