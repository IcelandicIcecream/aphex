---
'@aphexcms/cache-vercel-runtime': minor
---

New cache adapter backed by Vercel Runtime Cache. `apps/studio` now auto-selects it when the `VERCEL` system env var is set, ahead of the existing in-process `InMemoryCacheAdapter` fallback — a plain in-memory Map is per-instance and wiped on every cold start, so it barely functions as a cache on serverless.
