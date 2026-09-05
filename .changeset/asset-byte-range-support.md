---
'@aphexcms/cms-core': minor
'@aphexcms/storage-s3': minor
---

Serve assets with HTTP byte ranges, so video and audio stream instead of downloading whole.

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
