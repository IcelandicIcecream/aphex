---
'@aphexcms/plugin-forms': patch
---

On a tenant's address, a form submission must name one of that tenant's forms. Before, any tenant's page could post to another organization's form: the submission was stored there and its notification emails were sent. Now it's a 404, the same answer as a form that doesn't exist.
