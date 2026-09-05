# @aphexcms/storage-s3

## 15.0.0

### Major Changes

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`8bc885b`](https://github.com/IcelandicIcecream/aphex/commit/8bc885b88bbe2617a27c777cafb19c72a30dde9c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Implement the v1 `StorageAdapter` surface, and fix bucket scoping and signed URLs.

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

### Minor Changes

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Serve assets with HTTP byte ranges, so video and audio stream instead of downloading whole.

  `/media/{id}/{filename}` now answers `Range` with `206 Partial Content`, and advertises
  `Accept-Ranges: bytes` for every asset type rather than images alone.

  It previously advertised `Accept-Ranges` **only for images** while ignoring the header
  entirely — so it was both a promise nothing kept and a promise withheld from video, the one
  type that needs it. A browser could still play a video, but only by transferring it
  progressively from byte zero: seeking to the last minute of a recording meant downloading
  everything before it, and previewing three seconds cost a full-file read plus the egress to
  match. Small files hide this completely — a few MB over localhost feels instant — so it
  presents as "fine in dev, expensive in production".

  ## `StorageAdapter.getObjectRange`

  A new optional port method:

  ```ts
  getObjectRange?(path: string, start: number, end: number): Promise<ReadableStream<Uint8Array>>;
  ```

  **`end` is inclusive**, matching `Range: bytes=start-end` rather than the half-open
  convention most APIs use. Both first-party adapters implement it with a native ranged read,
  which is _less_ work than the buffered path: `fs.createReadStream(path, { start, end })`
  locally, and a `Range` header on the S3 GET for `storage-s3`. Adapters that don't implement
  it still serve ranges correctly — the route falls back to reading the object and slicing,
  which costs a full read per request but is never wrong.

  Two sharp edges pinned down in `storage-s3`: the client's `getObjectRaw` takes an
  **exclusive** `rangeTo`, so the adapter passes `end + 1` (getting this wrong drops the last
  byte of every range, which presents as a decoder bug); and `getObjectResponse` can't be used
  for this at all, since it sends its options as query parameters rather than headers and
  returns `null` for any status but `200` — a `206` would arrive as "not found".

  ## Range handling
  - Inclusive bounds, so `bytes=0-0` is one byte.
  - `bytes=-500` is the **last** 500 bytes, not "from 500 onward".
  - `bytes=500-` runs to the final byte; an end past the object is clamped rather than
    refused, because players routinely ask for more than exists.
  - A range starting at or past the end returns `416` with `Content-Range: bytes */total`,
    not a full body.
  - `Content-Length` on a `206` is the range's length, never the file's.
  - `Content-Range` reports the object's real size from `getObjectMetadata` where the adapter
    offers it, falling back to the stored row — the row's `size` can be stale, and a client
    trusts what it is told.
  - Multipart ranges (`bytes=0-99,200-299`) are answered with a normal `200` and the whole
    body, which is legal and simpler than emitting `multipart/byteranges`.

  Verified byte-for-byte against a running server, suffix ranges included.

  The admin's video and audio players use `preload="metadata"` again as a result: the browser
  fetches the moov atom rather than the file, which is also where the duration shown in the
  controls comes from.

### Patch Changes

- Updated dependencies [[`876cd15`](https://github.com/IcelandicIcecream/aphex/commit/876cd15b4b96fa296c5b2441bf68a348a0428771), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`8bc885b`](https://github.com/IcelandicIcecream/aphex/commit/8bc885b88bbe2617a27c777cafb19c72a30dde9c), [`484213d`](https://github.com/IcelandicIcecream/aphex/commit/484213d5af49f4dcde21c6a6ddf4d1002ac3a81f), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5)]:
  - @aphexcms/cms-core@10.0.0

## 14.0.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.1

## 14.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.0

## 13.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.1.0

## 12.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01), [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494)]:
  - @aphexcms/cms-core@9.0.0

## 11.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.1.0

## 10.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.0.0

## 9.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@7.0.0

## 8.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@6.0.0

## 7.0.0

### Minor Changes

- added a bunch of fixes

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.1.0

## 6.0.6

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.6

## 6.0.5

### Patch Changes

- add optimizations

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.5

## 6.0.4

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.4

## 6.0.3

### Patch Changes

- Update to allow singleton support

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.3

## 6.0.2

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.2

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.1

## 6.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.0

## 5.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [[`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253)]:
  - @aphexcms/cms-core@3.0.0

## 3.0.1

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.2

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.0

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.11

## 2.0.10

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.10

## 2.0.9

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.9

## 2.0.8

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.8

## 2.0.7

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.7

## 2.0.6

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.6

## 2.0.5

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.5

## 2.0.4

### Patch Changes

- add in memory caching

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.1

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@1.0.0
