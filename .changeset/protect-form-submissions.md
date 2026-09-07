---
'@aphexcms/plugin-forms': patch
---

Harden public forms for production: restrict stored submissions to organization owners and admins, route writes to the form's exact tenant, expose only an allowlisted public form projection, reject stale or oversized submissions, validate authored invariants, use trusted connection addresses for rate limits, and make submission events atomic and notification failures retryable.
