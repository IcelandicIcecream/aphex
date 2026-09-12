---
'@aphexcms/cms-core': patch
---

Fall back to initials, not a broken-image placeholder, when an organization logo or
user avatar fails to load.

`AssetImage` gains an optional `fallback` snippet, rendered instead of the `ImageOff`
placeholder when there is nothing to show. `OrganizationSwitcher` and `NavUser` now
pass the initials block they already drew when no image was set, so a _failed_ load
looks like an _absent_ one rather than introducing a second, unrelated empty state in
the corner of the sidebar.

Without a `fallback`, `AssetImage` behaves exactly as before.
