---
'@aphexcms/cms-core': patch
---

Sidebar and editor tidy-ups. An app's `navGroups` entry whose id matches a content-type group (`types:Website`) now takes that group's types first and its own links after, so schema types and app links share one heading. When `sidebar.types` lists the content types, the Structure tab is hidden (a lone Media tab too; link `/admin?view=media` from `navGroups` instead) and `?view=structure` with no document open goes to the start view. Sidebar links to a view (`/admin?view=media`) highlight while it's open. Custom blocks in rich text show their photo in the editor card.
