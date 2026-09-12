---
'@aphexcms/storage-s3': patch
---

Update the README for the `R2_*` → `S3_*` environment variable rename. Documentation
only — the adapter itself was never R2-specific and its options are unchanged.

The README ships inside the published tarball and is what npm renders on the package
page, so leaving it would have documented variable names that no longer match the
templates, at exactly the point someone is wiring up storage for the first time.
