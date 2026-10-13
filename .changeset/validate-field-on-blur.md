---
'@aphexcms/cms-core': minor
---

Validate a Studio field when focus leaves it, not only on document load and after save. A required field an editor tabs past stayed unflagged until publish; an `onfocusout` on the field wrapper now re-runs validation as soon as focus moves outside the field (ignoring focus moving between elements inside it). This runs on every blur, including any async custom validator a schema defines, so it adds one validation call per field visited rather than only at load and save.
