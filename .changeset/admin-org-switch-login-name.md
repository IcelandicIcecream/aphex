---
'@aphexcms/cms-core': patch
---

Switching organization while a tool is open (a dashboard on Home) now hands the tool the new `organizationId`, so it reloads for the new organization. Before, the id only changed when a document list was open. And a login with a logo no longer repeats the product's name under the card and in "New to …?".
