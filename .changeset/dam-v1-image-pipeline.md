---
'@aphexcms/cms-core': major
---

DAM v1: responsive image pipeline, real asset access control, and a single upload limit.

## Responsive images

Images are now served through a width ladder, generated **on first request** rather than at upload.
Nothing is produced until a browser asks for it, changing the ladder needs no migration or
regeneration script, and assets uploaded before this release are backfilled simply by being viewed.

```ts
export default createCMSConfig({
	images: { widths: [320, 640, 960, 1280, 1920], quality: 80 }
});
```

**Enabled by default** — those are the defaults, so the block is only needed to change them. Set
`images: null` to disable, in which case `/media` always serves the original.

Variants are siblings of the original: `/media/{assetId}/w960-{configHash}.webp`. The hash covers
the ladder and quality, so a variant URL's bytes can never change and the response carries a
one-year immutable cache. A request for a width outside the configured set serves the original
rather than generating anything — the allowlist is what bounds CPU and storage on a public route.

A new `<Image>` component renders it:

```svelte
<script lang="ts">
	import { Image } from '@aphexcms/cms-core/image';
</script>

<Image value={post.coverImage} alt={post.title} sizes="(max-width: 640px) 100vw, 720px" priority />
```

`sizes` is the per-placement control; there is deliberately no per-collection or per-block size
config. `assetService.injectAssetUrls` now fills in `srcset`, `width` and `height` alongside `url`,
and `ImageAsset` declares them — previously it declared only `url` and `alt`, so reading
`asset.srcset` off a generated document type was a type error.

Admin thumbnails use the smallest rung instead of full-size originals.

`urlFor(image).width(n).url()` now snaps to the nearest generated variant covering `n`. It
previously stored the width and returned the original unchanged — silently, with no error.
`.quality()`, `.format()`, `.fit()` and `.auto()` remain for source compatibility but are
documented no-ops.

## Breaking

- **`getObject` is now required on `StorageAdapter`.** `/media/:id/:filename` proxies every asset
  through it, which is what makes its access checks real. Previously S3/R2 assets were
  302-redirected to the bucket's public URL — the checks ran and were then bypassed, and a private
  bucket broke outright. Custom adapters must implement it.
- **`DocumentAdapter.clearAssetFromPublishedData` is renamed `clearAssetReferences`** and now
  clears `draftData` as well. Custom database adapters must rename their implementation.
- **An asset delete now removes its derivatives**, sweeping the whole `{assetId}/` storage key
  prefix (falling back to the recorded variants when the adapter can't `listObjects`).
- **`upload.maxFileSize` overrides the storage adapter's own limit.** `createCMSConfig` pushes the
  resolved value into the adapter via the new optional `setMaxFileSize`, so the request check, the
  direct-upload grant, the limit reported to the admin UI, and the adapter's guard are one number.
  Previously they were configured separately: a config allowing 100 MB in front of an adapter
  defaulting to 10 MB accepted the request and then failed inside `store()`. If you relied on the
  adapter's constructor value, move it to `upload.maxFileSize`.
- **Asset URLs are `/media/{assetId}/{filename}` for every backend**, no longer the bucket's public
  URL for S3.

## Also

- `signedDownloads.shouldUseSignedURL` opts large files out of proxying via a signed-URL redirect.
  Access checks still run first, so a signed URL is only minted for an already-allowed request.
- `upload.direct` enables presigned browser-to-storage uploads, for hosts that cap request bodies
  (Vercel rejects bodies over 4.5 MB before the app is invoked). Off by default: it additionally
  requires bucket CORS `PUT` from your origin, which nothing here can detect.
- Upload progress, concurrency limits, retry, and an upload-specific request timeout.
- `UploadFileData.key` lets a caller name the storage key; `StorageFile.key` is the
  adapter-relative key, distinct from `path`.
- `storageHealthCheck` (default off) includes object storage in `/aphex-health`.
- The delete guard no longer filters by registered schema type, so a document whose type was
  removed from the codebase can still block an asset delete — with a 409 naming it and its
  unregistered type. `?force=true` bypasses the guard, which is the only escape for a reference
  inside a document that can no longer be opened.
- `asset.read` is enforced on the list, by-id, references and reference-count routes.
- EXIF `.rotate()` before every resize, so portrait phone photos are no longer sideways.
  Derivatives are metadata-stripped, which gets EXIF/GPS removal for free; originals are untouched.
