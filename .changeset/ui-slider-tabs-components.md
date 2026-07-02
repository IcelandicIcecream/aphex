---
'@aphexcms/ui': patch
---

Add slider component export (`@aphexcms/ui/shadcn/slider`). Required by @aphexcms/cms-core >= 9.3.0, whose NumberField imports it — 9.3.0 was published against a ui version that never shipped this export, breaking consumers with `Missing "./shadcn/slider" specifier`.
