---
'@aphexcms/cms-core': patch
---

Deleting an organization no longer shows "Cannot read properties of undefined (reading 'name')". The delete always succeeded, but the success message read the organization's name after the page had navigated away from it.
