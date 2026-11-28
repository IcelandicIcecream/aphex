---
'@aphexcms/cms-core': patch
---

`sidebar.types` lists the document types plugins add, too. It built its list from the app's own schemas only, so a forms plugin's forms and submissions were missing from the sidebar while the rest of the admin showed them.
