---
'@aphexcms/storage-s3': major
---

Implement the v1 `StorageAdapter` surface, and fix bucket scoping and signed URLs.

## Breaking

- **The adapter is now scoped to `{endpoint}/{bucket}`.** s3mini derives its own bucket from the
  endpoint, so against an account-level R2 endpoint it resolved to the account hash rather than the
  bucket. If you configured a bucket-scoped endpoint yourself, that still works — the bucket is
  appended only when it isn't already there. `StorageFile.path` is unchanged.
- **`getSignedUrl` now returns a signed URL.** It previously returned an unsigned one, so anything
  relying on it for private-bucket access was returning a link that doesn't work. Requires s3mini
  1.0 (bumped from 0.7 for `getPresignedUrl`).
- **`maxFileSize` on `s3Storage()` is now a standalone default only.** Inside a CMS it is
  overridden at config time by `upload.maxFileSize`, so the limit has one home. Set it there.

## Added

- `getObject` — required by the `StorageAdapter` interface as of cms-core v1, since `/media` now
  proxies every asset rather than redirecting to the bucket.
- `listObjects` — lets an asset delete sweep every derivative under the asset's key prefix,
  including ones generated under a previous image config that the database no longer records.
- `copyObject`, `getObjectMetadata`.
- `getSignedUploadUrl` — presigned browser-to-storage uploads (`upload.direct`). Requires bucket
  CORS `PUT` from your origin.
- `setMaxFileSize` — adopts the app's configured upload ceiling.
