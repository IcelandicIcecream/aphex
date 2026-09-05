---
'@aphexcms/cms-core': minor
---

Private assets are actually enforced, and reachable by signed URL.

## `private` on a file field did nothing

`FileField` declares `private?: boolean` in the schema types, the docs describe it, and the CDN
route never checked it — the privacy test read `if (field.type === 'image')`. A `file` field marked
`private: true` served its PDF to anyone holding the URL.

A privacy control that is silently ignored is worse than one that doesn't exist, because the schema
says it is on. Both `image` and `file` are now checked.

## Library uploads had no privacy at all

Privacy is resolved from `schemaType` + `fieldPath`, recorded on the asset at upload. The media
browser — the main upload path in the DAM release — sent neither, so every asset uploaded through
the library evaluated as public regardless of where it was later used.

The picker now carries the field it was opened from (`ImageField`/`FileField` →
`AssetBrowserModal` → `MediaBrowser`), so an upload made from inside a private field inherits it.
Opening the Media tab directly still has no field to inherit from, which is correct.

## Signed URLs, on your own domain

`security.assetSigningSecret` has been in the config type since before this release, referenced by
the docs, and read by nothing. It now works.

`signAssetUrl()` (exported from `@aphexcms/cms-core/server`) appends `?exp=…&sig=…` to a
`/media/...` path; the route verifies it before the session checks and treats it as sufficient. That
is what makes a private asset usable in an `<img>`, a `<video>`, or an emailed link — none of which
carry an admin cookie.

Deliberately **not** `signedDownloads`, which redirects to a signed URL on the _bucket_: that hands
the viewer a storage-provider URL, exposes the key layout, and takes the request outside every check
this route performs, byte ranges and derivative selection included. Signing our own URL keeps all of
it in place and the bucket closed.

The signature covers the **asset id and expiry only**. Not the filename, which is cosmetic and would
make a rename break live links; not the requested width, since a responsive `srcset` asks for one
image at several widths and binding it would mean a signature per breakpoint. A signature answers
"may this caller read this asset", not "which rendition".

Fails closed throughout: with no secret configured, signing returns the URL untouched and
verification always fails, so a misconfiguration costs access rather than granting it. Expired,
tampered and mismatched signatures are rejected identically, without reporting which.

## Renaming a private field used to publish its assets

Privacy is not stored on the asset — the asset stores a _pointer_ to the field it was uploaded into,
and the answer is recomputed from the live schema on every request. That is what makes toggling
`private: true` in code apply immediately, with no migration.

It also meant the answer could stop being computable. Rename or delete that field and the lookup
returned nothing, which the route read as **public** — so a rename silently exposed everything
behind it.

The resolved value is now also stamped on the asset at upload and used as the fallback when the
pointer no longer resolves. The live schema still wins whenever it can answer, so nothing about
toggling changes. `resolveFieldPrivacy` returns `null` rather than `false` for "cannot answer",
which is what lets the two cases be told apart; when the fallback fires it logs the asset and the
dead path rather than passing silently.

An asset with neither pointer nor stamp stays public. Defaulting those to private would make every
pre-existing library asset inaccessible overnight.

The field-walking logic moved out of the CDN route into `utils/asset-privacy.ts`, shared with the
upload path so the two cannot disagree about what "private" means.

## A lock badge in the library

Privacy is declared on a schema field, so nothing in the media library indicated which assets a
`private: true` actually covered — and the honest answer (only those uploaded through that field) is
surprising enough to be worth showing. Private assets now carry a lock on the tile and a line in the
inspector explaining what it means and where it came from.

Computed server-side and reported as `isPrivate` on the list response, because it depends on the
live schema and an asset uploaded before stamping has no local answer at all — a client-side guess
would under-report exactly the assets the badge exists to identify.

Read-only, deliberately. A toggle here would introduce asset-level privacy as a second source of
truth alongside the field, with no rule for what happens when they disagree; that belongs with the
escalate-on-save work rather than bolted on beside it.

## Known limit

Privacy still comes from the field an asset was **uploaded into**, so an asset uploaded publicly and
later reused in a private field stays public. Documented in the schema and storage guides. Deriving
it from the asset-reference index instead would be wrong in the dangerous direction — that index
fails open, and access control must fail closed.
