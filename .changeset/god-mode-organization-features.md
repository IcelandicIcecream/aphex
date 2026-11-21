---
'@aphexcms/cms-core': minor
---

Switch an organization's features in God Mode. Give `organizationCapabilities` a `set` (and optionally `labels`), and God Mode's Organizations tab shows a switch per feature on every organization, saved through the new super-admin-only `PUT /api/organizations/:id/capabilities`. Ids outside `organizationCapabilities.ids` are refused. Without `set`, nothing changes.
