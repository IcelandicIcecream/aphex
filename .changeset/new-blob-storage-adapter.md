---
'@aphexcms/storage-vercel-blob': minor
---

New storage adapter backed by Vercel Blob. `apps/studio` now auto-selects it when `BLOB_READ_WRITE_TOKEN` is present (e.g. from the repo's "Deploy to Vercel" button), ahead of the existing S3/local fallback.
