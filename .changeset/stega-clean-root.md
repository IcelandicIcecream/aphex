---
'@aphexcms/cms-core': patch
---

`stegaClean` is exported from cms-core's root entry as well as `/client`, so server code (a page's head, a plugin's meta helper) can clean values without importing the admin.
