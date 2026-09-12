---
'@aphexcms/create-aphex': patch
---

Rename the object-storage environment variables from `R2_*` to `S3_*`, and let the
region through.

The adapter was never R2-specific — it is a plain S3 client, with worked examples for
R2, AWS S3 and MinIO — but the variable names said otherwise, so the one configuration
group read as a Cloudflare-only feature. The canonical names are now `S3_ENDPOINT`,
`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `S3_CDN_URL`
and `S3_REGION`.

**Existing deployments need no change.** Each variable still falls back to its `R2_*`
spelling, with `S3_*` winning where both are set — a half-migrated environment would
otherwise quietly keep using the old value while the new one looked applied.

`S3_REGION` is new, and its absence was a real bug rather than a missing nicety: the
adapter accepts a region and defaults to `'auto'`, but no template ever passed one, so
there was no way to set it from the environment. `auto` is what R2 and MinIO want and
what AWS S3 rejects — the region is part of the SigV4 credential scope, so against a
real S3 bucket every request signed as `auto` and came back `SignatureDoesNotMatch`
with the configuration looking entirely correct. AWS S3 was documented as supported and
was not reachable from a deployed template.

Both `render.postgres.yaml` blueprints now list `S3_REGION` alongside the rest, and the
storage docs carry the AWS caveat.
