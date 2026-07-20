---
'@aphexcms/cms-core': minor
---

Event consumers now receive the configured `emailAdapter` in their context, so a
consumer can send notifications (e.g. a form's "new submission" email) durably
and out of band. `FormDefinition` also gains an optional `notifyEmail` for
per-form notification routing.
