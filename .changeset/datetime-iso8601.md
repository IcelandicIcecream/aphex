---
'@aphexcms/cms-core': patch
---

The `datetime` field validator now accepts canonical ISO-8601 (e.g.
`new Date().toISOString()`) in addition to `YYYY-MM-DD HH:mm`, so a
`beforeValidate` hook that stamps an ISO timestamp no longer fails validation.
