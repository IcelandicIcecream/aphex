# @aphexcms/cms-core

## 10.1.0

### Minor Changes

- [#308](https://github.com/IcelandicIcecream/aphex/pull/308) [`e1a5693`](https://github.com/IcelandicIcecream/aphex/commit/e1a56936ef339cf050935986e082d1f71db1621a) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Enforce configurable accepted file types throughout image and file fields

  The `accept` option now consistently supports a comma-separated string or an array of exact MIME
  types, MIME wildcards, and filename extensions. Restrictions apply to file inputs, drag-and-drop,
  asset-picker uploads and selection, multipart uploads, and direct-to-storage upload grants. The
  server resolves the live schema rule when field context is available, preventing a client from
  loosening the field's allow-list. An optional `upload.allowedMimeTypes` configuration adds an
  installation-wide MIME security ceiling; field rules may narrow it but cannot widen it.
  Direct uploads are written to a temporary key and claimed once in the database before promotion.
  The promoted bytes are magic-inspected before confirmation succeeds, preventing a reusable signed
  upload URL or confirmation ticket from overwriting content that has already passed validation.
  When no installation-wide MIME policy is configured, uploads now use a conservative built-in
  safelist of common CMS formats. An explicit `allowedMimeTypes` list replaces these defaults while
  the non-overridable dangerous-content checks remain active.

- [#306](https://github.com/IcelandicIcecream/aphex/pull/306) [`f9df2ff`](https://github.com/IcelandicIcecream/aphex/commit/f9df2ffb33c6cc8969fbe3e479e7a7e082114215) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix `dependsOn` (and slug `source`) inside objects and array items

  A dependent list resolved `dependsOn` against the document root only. `dependsOn`
  names a _sibling_, and a field nested in an object or an array item has no siblings
  at the root — so a dependent list inside a page-builder block always found
  `undefined` and rendered "Please select X first" forever, which is indistinguishable
  from ordinary empty state. Arrays were the worst case: `SchemaField` passed no
  document data to `ArrayField` at all, so nothing below an array could resolve
  anything.

  Fields now receive two scopes. `documentData` is always the whole document;
  `siblingData` is the object the field is actually a member of — the array item, the
  inline object, or the document itself at the top level. `dependsOn` and a slug's
  `source` resolve against `siblingData` first and fall back to `documentData`, so a
  dependent list may name either a field of its own object or a document-level field,
  and repeated array items each resolve against their own values instead of sharing
  one answer.

  `ObjectModal` previously passed the edited object as `documentData`, which made
  local lookups work but hid the document from anything inside a modal; it now passes
  both, so the modal path gains the root fallback it never had.

  For plugin field components, `FieldComponentProps` gains `siblingData` alongside
  `documentData`, and `documentData` now consistently means the document in every
  position. A widget reading a sibling should switch to `siblingData` — inside an
  array item those are different objects.

- [#305](https://github.com/IcelandicIcecream/aphex/pull/305) [`debafeb`](https://github.com/IcelandicIcecream/aphex/commit/debafeb8657ff31815ce11d065a1edcf98fec801) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Private assets are actually enforced, and reachable by signed URL.

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

- [#306](https://github.com/IcelandicIcecream/aphex/pull/306) [`7b8e85c`](https://github.com/IcelandicIcecream/aphex/commit/7b8e85c9742b9755c9beadcd889dc8657cbf920e) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add `ensureRecurringJob` / `scheduleNextTick` for recurring work

  There is still no "recurring job" row type, and deliberately so: a repeating job is a
  _chain_, where each tick's handler enqueues the next before returning. That keeps one
  mechanism instead of two — a tick is an ordinary job, so it inherits leases, backoff,
  dead-lettering and the Activity view — and lets a chain switch itself off per
  environment by simply not rescheduling.

  What was missing was a correct way to _start_ one. Both halves are quiet to get wrong,
  because every tick a dead chain doesn't run is a thing that silently doesn't happen and
  nothing in the UI reports:
  - `ensureRecurringJob(adapter, { organizationId, type, runAt?, ... })` starts a chain
    only if one isn't already running, deciding on **liveness** (`pending` or `leased`)
    rather than an idempotency key. The keyed version looks right and fails later: the
    bootstrap job completes immediately — that being the point — after which every arming
    call gets that finished row back and no-ops, so a chain that dies can never be revived
    while the arming call still reports success. Liveness answers correctly in both
    directions: never a second live chain, always a revived dead one. Safe to call on any
    path implying the feature is in use (a settings panel opening, a manual sync).
  - `scheduleNextTick(adapter, job, { intervalMs })` continues a chain from inside the
    handler, inheriting the running job's organization, type and attempt budget, and
    enqueuing without a key (a key would collapse every tick onto one row). The interval
    is measured from completion, so a chain that falls behind spaces out rather than
    firing a catch-up burst.

  Both are exported from `@aphexcms/cms-core/server`.

- [#306](https://github.com/IcelandicIcecream/aphex/pull/306) [`5d72187`](https://github.com/IcelandicIcecream/aphex/commit/5d72187348af378c7867fd23220856dc6001eaea) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Let `scheduleJob` revive a dead-lettered idempotency key

  `scheduleJob`'s idempotency lookup ignored the job's status, so a key was a
  permanent tombstone: once any row existed under it, every later enqueue returned
  that row — including a `failed` one. Fix the handler, redeploy, re-enqueue, and
  you silently got the dead letter back with no error, and the work never ran again.
  Cancelled schedules were unrescheduleable for the same reason, and any job keyed
  on a stable string was effectively one-shot.

  `scheduleJob` now accepts `resurrect: true`, which resets an existing `failed` or
  `cancelled` job to `pending` with a fresh attempt budget and the new call's
  `payload`/`runAt`/`maxAttempts`. A `completed` job is still returned untouched —
  not re-running finished work is what the key is for — and so are `pending` and
  `leased` ones, so this can't stomp a job a worker is currently holding (the guard
  is in the UPDATE, not a read-then-write).

  Off by default, because whether a failure has been fixed is a question only the
  caller can answer. Don't set it on a hot read path: a permanently broken job would
  then be re-armed on every request. For that case the operator's route is
  unchanged — `requeueJob`, surfaced as Retry in the Activity view.

### Patch Changes

- [`03a1ab0`](https://github.com/IcelandicIcecream/aphex/commit/03a1ab04e68665fda2f98b8b75069e392f51f11f) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix directory imports breaking the published build

  Importing certain modules from the package crashed at runtime with
  `Failed to load url ../../../images.js ... Does the file exist?`. It affected the
  assets route (`server/api/routes/assets.js`) and the client API barrel
  (`client/api.js`).

  The cause was the build's import-rewriting step. Source code imports a couple of
  modules by directory — `from '../../../images'`, which bundler resolution takes
  to mean `images/index.ts`. The rewriter appended `.js` unconditionally, producing
  `../../../images.js`, a path that does not exist; the real file is
  `images/index.js`. It now detects a directory target and emits `/index.js`.

  This was invisible inside the monorepo, where every consumer resolves the
  package's `src` rather than `dist`, so only installed users ever saw it. There is
  a new `scripts/run-template-standalone.sh` that runs a template against packed
  tarballs — the real published artifact — which is how this surfaced and how the
  class of bug gets caught from now on.

- [#306](https://github.com/IcelandicIcecream/aphex/pull/306) [`6343a71`](https://github.com/IcelandicIcecream/aphex/commit/6343a71e7985b4b9cb8629045adc141b466272bb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Collapse the document-type list before the document list when panes run out of room

  When space got tight the admin collapsed the docs list first and the type list last, on
  the reasoning that panes are depth-ordered and the shallowest should yield last. That
  reads the wrong signal: depth describes how you got to a document, not what you still
  need now that you're there.

  While editing, the type list is the pane you're least likely to want — you already know
  what you're editing, and switching type is a rarer move than switching between documents
  of the same type, which is the docs list's whole purpose. Keeping a list of types you
  aren't using while collapsing the list of siblings you're moving between had it backwards.

  The order is now types, then docs. Everything else about the behaviour is unchanged: an
  open editor still never gives way, a pane the user explicitly expanded by clicking its
  strip is still never collapsed in the same derivation, and both lists still collapse when
  two editors are open.

## 10.0.0

### Major Changes

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`8bc885b`](https://github.com/IcelandicIcecream/aphex/commit/8bc885b88bbe2617a27c777cafb19c72a30dde9c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - DAM v1: responsive image pipeline, real asset access control, and a single upload limit.

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

  <Image
  	value={post.coverImage}
  	alt={post.title}
  	sizes="(max-width: 640px) 100vw, 720px"
  	priority
  />
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

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Filter assets by media kind, and search their metadata — both in SQL.

  ## Media kind

  `GET /assets` takes an optional `category` — `image`, `svg`, `video`, `audio`, `document` —
  carried to the adapter as `AssetFilters.category` and resolved against `mimeType`.

  It is a separate axis from the existing `assetType` (`'image' | 'file'`), which records how
  the upload pipeline treated the file. This one groups by what an editor is hunting for,
  which is why **SVG is its own bucket rather than an image**: it's what you pick when looking
  for a logo, and it behaves unlike a raster image everywhere else too. `document` is the
  negative space — whatever isn't image, video or audio.

  ## Search covers metadata

  `search` now matches `title`, `alt` and `description` as well as the filename. Alt text
  written for accessibility is also how the asset gets found again, which is most of the
  difference between a media library and a file browser.

  It is also **case-folded on both dialects**. The previous bare `LIKE` was case-sensitive on
  Postgres and case-insensitive on SQLite, so the same query returned different results
  depending on the database — the sort work fixed this for ordering, and this closes the same
  gap for search.

  ## The list and its total can no longer disagree

  `findAssets` and `countAssets` built their filter conditions from separate code in both
  adapters, and the HTTP route passed `countAssets` a hand-copied subset of the filters. A
  filter applied to the page but missed in the count shows "1–20 of 300" above eleven rows.
  Both adapters now share one `buildAssetConditions`, and the route passes one object to both
  calls. The conformance suite asserts the two agree for every filter.

  No schema change: this is `WHERE` over existing columns. Third-party `AssetAdapter`
  implementations are unaffected — `category` is optional, and ignoring it keeps today's
  behaviour.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Index which documents use which assets, and filter the media library by usage.

  ## The problem

  "Where is this asset used?" was answered by

  ```sql
  WHERE CASE WHEN status = 'published' THEN published_data::text ELSE draft_data::text END
        LIKE '%<assetId>%'
  ```

  — a full scan casting every document's JSON to text, which no index can serve. Survivable
  for a single asset, impossible as a _filter_: "show me unused assets" becomes assets ×
  documents. It also matched the id anywhere in the JSON, so an id pasted into a text field
  read as a reference, and it could only ever answer "somewhere in this document", never
  which field.

  ## `cms_asset_references`

  A new table — `organization_id`, `asset_id`, `document_id`, `document_type`, `field_path`,
  `plane` — indexed on `(organization_id, asset_id)` and `(organization_id, document_id)`,
  with the same RLS org-isolation policy as the other tables on the Postgres side.

  `plane` separates `draft` from `published` because they answer different questions. An
  asset used only by an abandoned draft is a different risk from one on a live page, and it
  still counts as **in use** — the safe direction to err, since "unused" is what invites a
  delete.

  `field_path` records where the reference sits (`coverImage`, `content[3].media`), which is
  what turns "used by 3 documents" into something an editor can act on.

  ## `AssetFilters.usage`

  `GET /assets` takes `usage=in-use|unused`, resolved as an indexed `EXISTS` against the
  index. It composes with the existing category and search filters, and `countAssets` applies
  it too, so the pager can't report totals for a different set of rows than the page shows.

  ## Maintenance

  `AssetReferencesService` mirrors the existing `ReferencesService` exactly: the collection
  API calls it after a save, the walk is replayed, and that document's rows are replaced
  delete-then-insert (idempotent, no stale rows). Failures are logged, never thrown.

  Content predating the index is covered by a one-time bulk pass, run as a job
  (`asset-references.backfill`) rather than inline. Without it every pre-existing asset would
  report **unused** — the one answer that invites deletion — but the pass walks every document
  in the organization, so doing it in the request meant the first editor to open "Unused" wore
  the whole walk before their page rendered. The listing endpoint enqueues it on first use
  under a fixed idempotency key, so repeated clicks collapse onto one job, and the handler
  short-circuits once the index has rows, so a retry resumes rather than restarting.

  While it runs, the response carries `indexing: true` and the media browser says
  "Indexing usage…" instead of presenting a wholly-unused library as fact.

  **Best-effort indexing is safe here because deleting an asset does not consult the index.**
  That guard still calls `findDocumentsReferencingAsset`, which reads the documents
  themselves, so a stale index can misreport a badge or a filter until the next edit or
  backfill — it can never cause a referenced asset to be destroyed. The destructive path
  stays on the authoritative source.

  ## `collectAssetReferences`

  The sibling of `reference-walk.ts`, which collects document references and deliberately
  steps over image/file nodes. This one collects only those, with their field paths, and is
  careful about two things the index would otherwise be poisoned by: it does not descend into
  a document reference (a denormalised copy of the target would attribute that document's
  assets to the referrer), and it rejects half-written references, which would otherwise pin
  an asset as "in use" forever.

  New adapter methods `replaceAssetReferences` and `hasAnyAssetReferences` are both optional
  on the port — an adapter that skips them simply has no index and no `usage` filter.

  ## References panel

  Each entry now says _where_ the asset is used, not just which document —
  `Blog post · draft · Content 14 › Images 1` instead of `Blog post · draft`. Paths come from
  the index and are annotated onto the authoritative result, so a missing row costs a label
  and never a wrong answer about whether the asset is referenced. Indices read 1-based,
  because a person is counting items on a page.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`484213d`](https://github.com/IcelandicIcecream/aphex/commit/484213d5af49f4dcde21c6a6ddf4d1002ac3a81f) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Media browser: range selection, a reachable Save button, and asset sorting that spans pages.

  ## Sorting is applied in SQL

  `GET /assets` takes a new optional `sort` parameter — `newest` (default), `oldest`, `name-asc`,
  `name-desc` — and `AssetFilters.sort` carries it to the adapter.

  It previously sorted the _loaded page_ in the browser, so "Name: A–Z" across 300 assets
  alphabetised whichever 30 rows had been fetched: page 1 showed the A's of the newest 30 uploads
  rather than the A's of the library. It rendered perfectly, which is why it went unreported.

  Both relational adapters order by the same keys, with two properties the conformance suite pins:
  names are compared case-folded (SQLite's binary collation otherwise sorts `Zebra.png` before
  `apple.png`, so the two dialects would return different pages), and `id` is always the final sort
  key, so a tie — two files uploaded in the same millisecond, two assets called `logo.png` — can't
  put one row on two pages of an `OFFSET` scan and another on none.

  No schema change: this is `ORDER BY` over existing columns. Third-party `AssetAdapter`
  implementations are unaffected — `sort` is optional, and ignoring it keeps today's behaviour.

  `AssetFilters` was declared twice, identically: once as the database port and once in
  `asset-service.ts`, which is the copy the `/server` barrel exports and therefore the one every
  adapter imports. The service copy is now a re-export of the port.

  ## Selection
  - **Shift-click extends a range** in both grid and list, on tiles, rows and checkboxes. The range
    repeats what the anchor click did, so shift-clicking after a deselect _clears_ the range — the
    only practical way to undo an overshoot on a large page. The anchor stays put afterwards, so a
    second shift-click re-extends rather than chaining.
  - **Selecting anything enters select mode**, and emptying the selection leaves it again unless the
    mode was turned on deliberately. The list's checkboxes are always visible, so it was possible to
    tick boxes outside select mode and get no action bar and no way to act on them.
  - Grid tiles show a checkbox on hover, giving the grid the same entry point as the list rather than
    requiring the toolbar's icon button.
  - Select-all moved into the action bar, so it works in grid view and not only in the list header.

  ## Fixed
  - The list view rendered only the unselected assets, so in multi-select picker mode the images
    already in the field were invisible there — and could not be deselected without switching to
    grid.
  - A page whose assets were all already selected showed "No assets found" over a full grid.

  ## Asset detail panel

  The panel is a fixed-height column with one scrolling region instead of scrolling as a whole, so
  **Save is always on screen**; reaching it used to mean scrolling past the preview and five fields
  for every asset. It is disabled until something actually changes and reads "Saved" when clean, and
  switching or closing an asset with unsaved metadata now asks before discarding it.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Both reference indexes are now written inside the document's own write transaction, and the
  delete guard checks both content planes.

  ## The index could not be trusted, and "Unused" is a deletion workflow

  Indexing ran after the write, best-effort, on the reasoning that a stale index costs a wrong
  badge while the delete guard — which reads the documents themselves — keeps the destructive
  path safe. The guard half held, and it is what caught this. The rest did not: the **Unused**
  filter _is_ the index, so a missing row doesn't produce a blemish, it invites an editor to
  delete an asset that is in use.

  Worse, the rebuild that was supposed to repair drift could never run. Three separate gates
  were keyed on "does this org have any index rows" — the enqueue check, the job handler's
  `backfillIfEmpty`, and a permanent idempotency key. Ordinary saves create rows too, so the
  first document saved after the index shipped closed all three, forever. Every document not
  re-saved since stayed invisible, and `usage: 'unused'` listed its assets as free to delete.

  Indexing now happens in the same transaction as the write that caused it, the way
  `appendEvent` already writes the outbox: a document cannot be saved without its references
  being recorded. `ReferencesService` gets the same treatment — its index backs the publish and
  unpublish guards, where an under-populated index doesn't mislabel anything, it lets a
  still-referenced document through.

  **The tradeoff, stated plainly:** a failure in the walk now fails the editor's save instead of
  being swallowed. That is the cost of the guarantee. `collectAssetReferences` is pure,
  separately tested, and skips malformed references rather than throwing.

  The draft-create and draft-update paths gained transactions they did not have.
  `saveWithVersion` takes an `alsoInTx` callback rather than being wrapped, because it owns its
  transaction and nesting `withTransaction` isn't something every adapter promises.

  ## The rebuild is a migration again

  `backfillIfEmpty` is now `backfill` and is unconditional. Whether to run is the caller's
  business, and the caller's marker is a **versioned job idempotency key** — `scheduleJob`
  returns the existing row instead of inserting a duplicate, so a completed job _is_ the record
  that an org has been rebuilt, and bumping `REFERENCE_BACKFILL_VERSION` forces exactly one more
  pass. A marker no ordinary write can forge, unlike the flag it replaces.

  Per-document failures are logged and skipped rather than abandoning the run.

  **This release bumps the version, so every org rebuilds once** — which is also the repair for
  any index left incomplete by the old gate. The rebuild runs on the job queue, so it needs a
  worker ticking.

  ## The delete guard checked one plane

  `countDocumentReferencesForAssets` and `findDocumentsReferencingAsset` picked a column by
  status: `publishedData` for published documents, `draftData` otherwise. So an asset placed in
  the draft of an already-published document was invisible to the guard — it reported
  "unreferenced", the asset was deletable, and the editor came back to a broken image they had
  just placed. Both now check both planes, matching the index, which records both. One document
  still counts once.

  Covered cross-dialect: index rows commit and roll back with the document, a published
  document's draft-only reference is found, a published-only leftover is found.

  ## The index must cover what the guard scans

  The backfill iterated document types from the **schema registry**. Removing a schema type
  doesn't remove its documents, and those documents keep referencing whatever assets they always
  did — while the delete guard reads documents unfiltered and still finds them.

  So the index and the guard disagreed on exactly those assets: "Unused" offered them, the delete
  refused, and the blocking document was nowhere to be found in the admin. New optional port
  method `listStoredDocumentTypes(organizationId)` returns every distinct type actually present,
  and the asset backfill walks those instead.

  Only the asset index can do this — `collectAssetReferences` reads raw JSON and needs no schema,
  whereas the document-to-document walker is schema-aware and has nothing to walk a schema-less
  type with. `ReferencesService.backfill` still takes registered schemas, deliberately.

  ## One dangling reference unindexed the whole document

  The bug that produced the symptom, and the least obvious of them.

  `cms_asset_references.asset_id` is a foreign key, and `replaceAssetReferences` wrote a
  document's rows as one batch insert. So a single reference to an asset with no row — deleted
  outside the app, or content restored from a copy whose media never came with it — failed the
  entire statement. The document got **no index rows at all**, its live references disappearing
  alongside the dead one.

  The result was an asset that was simultaneously unusable and undeletable: absent from the index
  so the library listed it as unused, present in the document JSON so the guard's substring scan
  refused to delete it.

  Dangling ids are ordinary rather than exceptional, so they are now filtered out before the
  insert, checked by id exactly as the foreign key checks. One dead neighbour no longer costs the
  live references their rows. Covered cross-dialect by a test that fails on both dialects without
  the fix.

  ## The walker only recognised `_type: 'image'` wrappers

  Smaller, and worth being accurate about: an earlier draft of this changeset claimed rich-text
  images were stored with the asset ref nested under `data`. They are not — the Portable Text
  serializer flattens `data` into the block on the way to storage, so the persisted shape is the
  same flat `{ _type: 'image', asset: { _ref } }` the walker already handled.

  What did change is that the walker now records any object carrying `asset: { _ref }`, whatever
  its `_type`, rather than only `image` and `file` nodes. That covers custom block types that hold
  media without declaring themselves as images.

  Worth stating the asymmetry that made all of these present identically: the delete guard is a
  structure-blind substring scan and the index is a structure-aware walk, so the guard always
  finds a superset. Every gap in the walker therefore shows up the same way — the asset reads as
  unused, and then refuses to delete. `collectAssetIdsUnstructured` now runs alongside the walk
  during a rebuild and logs the difference, so the next gap announces itself in a log line instead
  of at someone's delete prompt.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Video posters and duration, extracted in the browser at upload.

  A video with no poster is a black rectangle until someone presses play, and a media grid of
  those identifies nothing. Duration has the same problem: it lives in the container, so
  nothing in the database knows it.

  ## Extracted in the browser, not on the server

  `extractVideoInfo(file)` reads duration, real pixel dimensions and a frame from the local
  file before it is uploaded — `<video>` → `loadedmetadata` → seek → `canvas.drawImage` →
  WebP.

  The alternative was ffmpeg: a large native dependency, awkward on serverless, and a
  build-time cost for every self-hoster who never uploads a video. The browser already ships a
  demuxer and decoder for exactly the formats it can play, and at upload time the file is
  local — no download, no storage round-trip.

  The honest tradeoff: a codec this browser cannot decode, or an upload that never went
  through a browser, yields nothing. Every field is optional and absence is never an error.

  The frame is taken at 10% in (capped at 3s) rather than at 0, because the first frame of a
  video is so often black, a fade, or a slate.

  ## Storage

  The frame lands at `{assetId}/poster.webp`, beside `{assetId}/original.mp4`. That prefix is
  load-bearing: asset deletion already sweeps the whole `{assetId}/` prefix, so a poster is
  cleaned up with its video with no reference tracking and no orphan sweep.

  Duration goes to `metadata.duration` and dimensions to the existing `width`/`height`
  columns, which sit null for video today. No migration — `AssetMetadata` carries an open
  index signature.

  Serving goes through `/media/{id}/poster.webp`, the same route and the same access checks as
  everything else. A separate endpoint would have meant a **private video with a public
  thumbnail at a guessable URL**. A video with no poster answers `404` rather than falling
  through to the video, so an `<img>` never receives 30MB of MP4.

  ## Endpoint

  `POST /api/assets/{id}/poster` attaches a frame to an existing video. It is separate from
  the upload because the storage key derives from an asset id that does not exist until the
  row does: upload the video, learn the id, then send the frame. It requires `asset.upload`,
  refuses non-video assets (otherwise it is a way to write an arbitrary image under any
  asset's prefix), and sniffs the bytes rather than trusting the declared type.

  Poster upload is deliberately not folded into the upload's success: a video that uploaded
  fine has uploaded fine, and losing its thumbnail must not report as a failure.

  ## Existing videos

  Videos that predate this — or arrived through the API, where no browser saw the file — get
  posters automatically. The media browser spots videos on the current page with no poster and
  fills them in behind the rendered grid.

  It is only affordable because the media route now serves byte ranges: the browser fetches the
  container header and the frames around the seek point, not the whole file. Against a
  `200`-only server this would have downloaded an entire video to capture one frame.

  Three limits, each load-bearing: only assets on the page in front of the user, one at a time,
  and never the same asset twice per session — otherwise a video the browser cannot decode is
  retried on every render, since failure leaves no poster and an absent poster is the trigger.
  Results are patched into the list in place rather than refetching, so a background task never
  moves the grid under someone mid-click.

  **Generate poster** remains in the inspector, but only appears once the automatic pass has
  already failed for that asset — an explicit retry rather than a decision anyone has to make.

  Client-supplied duration and dimensions are bounded server-side (24h, 16384px) rather than
  trusted, since they arrive from a client and land in columns other code reasons about.

### Patch Changes

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`876cd15`](https://github.com/IcelandicIcecream/aphex/commit/876cd15b4b96fa296c5b2441bf68a348a0428771) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Admin panes size to the space they actually have, and the history panel follows the document you're editing.

  ## The version history panel showed the wrong document

  `history=1` survives navigation, and the URL sync only opened the panel when it was
  currently closed. Switching documents with history open therefore left
  `versionPanelDocId` pointing at the _previous_ document: the version list belonged to one
  document while the editor showed another, and Restore would have written to the document
  you were no longer looking at. It now retargets on every navigation and drops any version
  preview from the old document.

  ## Panes

  The layout maths measured `window.innerWidth`, which counts the app sidebar — a pane the
  editor never gets — and ignored the 280px history panel entirely. The available width was
  overstated by roughly 540px, so the collapse logic concluded there was plenty of room and
  never fired: opening history squeezed the editor to ~300px between two full-width lists
  instead of collapsing them.
  - Width is measured from the pane container and the history panel is subtracted, so the
    number the collapse logic sees is the number the editor actually gets.
  - `MIN_EDITOR_WIDTH` is now what the editor _wants_, not a floor it must clear to be
    shown. Collapsing it to a 60px strip only makes sense if another pane claims the space;
    when nothing does, a narrow editor beats a strip beside an unused gap.
  - Clicking a collapsed strip always takes effect. The panel the user just expanded is
    never the one collapsed to make room — doing so undid the click in the same derivation,
    which was indistinguishable from the click doing nothing.
  - Focus and space priority are separate: a list panel holding focus no longer drops the
    open editor out of the expanded set.
  - Both lists keep a fixed width and never flex. Only the editor absorbs leftover space —
    a list stretched across 700px is mostly whitespace.

  Whenever a document is open the panes tile the container exactly. With nothing open the
  lists sit at their natural width.

  ## Mobile

  The history panel was a fixed 280px column with no small-screen handling, leaving ~95px
  for the fields on a 375px viewport. Below 620px it is now a full-screen sheet.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - `includeChildOrganizations` now works for assets. It never had.

  Both adapter facades resolved the organization's subtree and passed the result down as
  `filterOrganizationIds` — and both asset adapters ignored the field entirely, building their
  `WHERE` from `organizationId` alone. A parent organization asking for its subsidiaries' media
  got its own library back, with no error to say the request had been dropped.

  `buildAssetConditions` now scopes to `filterOrganizationIds` when the facade supplies it. It
  _replaces_ the single-org clause rather than joining it with `AND`, which would have narrowed
  straight back to the caller.

  `countAssets` was widened too. The facade had only ever expanded the hierarchy for
  `findAssets`, so had the filter worked, a page spanning the subtree would have sat under a
  total that didn't — "1–20 of 4" over twenty rows. Both now go through one
  `resolveAssetOrgScope` helper, the same reason the two share a clause builder.

  `AssetFilters` gains `includeChildOrganizations` and `filterOrganizationIds`, so the facade
  signatures drop their `any`. The two are a request and its resolution: callers ask for the
  subtree, the facade resolves it once per request.

  Widening is opt-in and downward-only — a child never sees its parent's library — and it
  composes with search, category and usage rather than replacing them. Covered by the
  cross-dialect conformance suite.

  No behaviour changes without the flag, and nothing in the admin UI sets it for assets yet.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Bulk asset delete stops contradicting itself, gains force, and the selection bar sticks.

  ## The client and the server were answering different questions

  Before sending a bulk delete, the media browser counted references via
  `getReferenceCounts` — which filters to **registered** schema types. The server's delete guard
  scans **unfiltered**, deliberately: a document whose type was removed from the codebase still
  exists and still holds its reference.

  So an asset blocked only by an orphaned type passed the client's check, hit the server, and
  came back 409 — while the client insisted nothing referenced it. Asking two different
  questions and treating them as one answer is the bug.

  The pre-check is gone. The server does a fresh authoritative scan on every attempt, so it is
  the only sensible authority; the client attempts the delete and handles the refusal.

  ## Bulk delete had no force, and its refusal was a dead end

  The single-asset path already reported which blocking documents use unregistered schema types
  and offered force, because those documents cannot be opened in the admin — the reference
  cannot be removed by hand, so without force the asset is simply undeletable. The bulk route
  inherited none of it: one flat sentence, no way forward.

  It now returns `unregisteredTypes` alongside `referencedIds`, accepts `?force=true`, and the
  browser offers **Force delete** on exactly the condition the single-asset flow does. The
  server-corrected counts are written back so the grid stops showing the blocked assets as
  unused before the next fetch.

  ## What force actually does

  Both force dialogs claimed it "leaves a dangling reference". It doesn't — `clearAssetReferences`
  runs on every delete and strips the asset from `draftData` on every document, and from
  `publishedData` on non-published ones.

  The single exception is `publishedData` on a **currently published** document, which is left
  alone on purpose: that column is written only by publish, and rewriting it here would desync
  the content hash from its version record. The reference leaves on the next publish, when the
  cleaned draft flows through normally.

  So the accurate statement, and what the dialogs now say: drafts are cleaned immediately, and a
  live page keeps the reference until it is republished, where it renders as nothing.

  ## Sticky selection bar

  The bulk action bar lived inside the scrolling grid, so it scrolled away — stranding the
  selection you had just built, with the running count out of sight while you built it. It is
  now `sticky top-0` against the scroll container.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Drag-and-drop upload no longer flickers.

  Two causes, compounding.

  `dragleave` fires whenever the pointer crosses onto a **child** element, not only when it
  leaves the region — and the media grid is nothing but children. Toggling a boolean on
  enter/leave switched the overlay off every time the cursor moved between tiles, and the next
  `dragover` switched it back on. Enter/leave now increment and decrement a counter, which
  reaches zero only when the drag has genuinely left.

  The counter alone wouldn't have fixed it, because the overlay was itself a drop target. It
  renders directly under the cursor mid-drag, so the moment it appeared it took the drag, firing
  a real `dragleave` on the region — which hid the overlay, putting the cursor back over the
  grid, which showed it again. A feedback loop running at pointer-move rate. The overlay is now
  `pointer-events: none`.

  Also fixed while in here:
  - **Non-file drags are ignored.** Dragging a text selection or one of the grid's own tiles used
    to raise "Drop files to upload" over the page for a drop that could produce nothing.
  - **A drag that ends outside the window no longer strands the overlay.** Dropping on the
    desktop or cancelling with Escape delivers no `dragleave`, so the highlight stayed until the
    next drag.
  - An empty drop no longer opens the upload dialog on an empty queue.

  The upload dialog's own drop zone had the same handlers and gets the same fix.

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Media grid reads as a library rather than a contact sheet, and upload rows are identifiable.

  ## Grid

  The grid was laid out on a fixed `xl:grid-cols-10`, which on a wide screen gave ~90px
  thumbnails: you could see a lot of assets but not recognise any of them. Tracks are now
  sized by a minimum width (`repeat(auto-fill, minmax(…, 1fr))`), so the column count follows
  the width actually available — opening the inspector reflows the grid instead of squeezing
  the tiles — and a thumbnail stays large enough to tell two crops of the same photo apart.

  A **Compact / Default / Large** control replaces the page-size select in the toolbar.
  Default is ~165px tiles, roughly 6 across on a typical desktop; Compact is close to the old
  density for anyone who preferred it. The choice is remembered per browser. The page-size
  select cost permanent toolbar space to answer a question editors rarely have — how many
  assets fit on a page matters much less than whether they can identify one.

  Tiles are now cards: a bordered preview box with the filename and a `PNG · 2480×3508 ·
17.4 MB` line under a divider, and the whole card is the selection target rather than a
  ring drawn around the thumbnail and label. Previews still use `object-fit: contain`, so
  portrait, landscape and SVG assets are never cropped.

  ## Non-image assets are distinguishable

  Everything that wasn't an image fell through to one generic page icon, so an mp4, an mp3
  and a PDF looked identical — most visible once the media-kind filter existed, where
  narrowing to "Video" produced a grid of the same card repeated. Placeholders now vary by
  kind (film, music, archive, document), playable media carries a play badge, and the badge
  shows the duration when it's known.

  Selecting a video or audio asset gives a real player in the inspector rather than an icon,
  with `preload="none"` so nothing is fetched until play is pressed.

  **Playback is limited until `/media/:id/:filename` supports byte ranges.** It advertises
  `Accept-Ranges` for images only and ignores the header outright — a `Range: bytes=0-1023`
  request returns `200` with the entire body. Two consequences: the browser cannot fetch part
  of a file, so `preload="metadata"` would download a whole video just to draw the player
  (hence `none`); and seeking doesn't work, with Safari likely declining to play at all since
  it expects a `206`. Range support on that route is the fix and is not in this change.

  Duration is read from `metadata.duration` (seconds), which needs no migration because
  `AssetMetadata` carries an open index signature. Nothing populates it yet; assets uploaded
  before it does simply show the badge without a time.

  Grid/list, sort order and density are all remembered per browser — they're editor habits
  rather than app state, and resetting them on every visit is a small daily annoyance.

  ## Upload dialog

  **It no longer closes itself.** A fully successful run used to dismiss the dialog on an
  800ms timer, taking the result away exactly as it appeared; on a slow backend a large
  upload is precisely when someone wants to watch it land. It now stays open with explicit
  **Clear list** and **Done** actions, both disabled while uploads are in flight.

  **The queue survives an accidental dismiss.** Opening the dialog used to clear it, so
  clicking outside and reopening discarded the batch — including uploads that were still
  running and simply became invisible. The queue is now cleared only by Clear list or Done,
  and the drop zone stays available for the next batch.
  - Each row shows an image thumbnail, so a failure can be identified by sight instead of by
    reading filenames.
  - A `N files selected · 23.6 MB` summary sits above the list.
  - Queued rows read **Waiting…** while other uploads are in flight, rather than showing a
    size that looks like nothing is happening.

  Preview object URLs are revoked when the queue is cleared; they would otherwise live until
  the document unloaded.

  ## Inspector

  Filename, MIME type, size, dimensions, upload date and asset id all had equal billing above
  the fields an editor actually edits — so the panel led with facts nobody opened it for and
  pushed alt text below the fold.

  The identifying detail is now one summary line (`hero.jpg` / `JPEG · 1600×900 · 195 kB`),
  the editable fields sit directly under it, and everything addressed to a developer moves
  into a collapsed **File information** disclosure. Nothing was removed: MIME type, size,
  dimensions, duration, upload date and the copyable asset id all live there.

  It is a native `<details>`, which needs no component state to get out of sync, is keyboard
  accessible and findable by in-page search for free, and reopens closed on the next asset —
  the right default for a panel whose job is the fields above it.

## 9.10.0

### Minor Changes

- [#301](https://github.com/IcelandicIcecream/aphex/pull/301) [`1f29e3f`](https://github.com/IcelandicIcecream/aphex/commit/1f29e3f4fdb4acdbc6bf709398564e9a770b5e1c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an opt-in `public` option to `find`/`findByID`/`get` that strips `_meta.organizationId`, `createdBy`, `updatedBy`, and `publishedHash` from returned documents before they leave the call.

  AphexCMS is embedded, not headless — a `load()` function calling the Local API gets whole documents back and typically passes them straight through to the client for hydration. That leaks these internal fields into every public page's source for any visitor or crawler to read in view-source, something a headless CMS (Sanity's GROQ, Payload's GraphQL/REST `select`) can't do by construction, since the frontend has to name every field it wants.

  Set `{ public: true }` on any read used to render a public-facing page:

  ```ts
  const { docs } = await localAPI.collections.page.find(context, {
  	perspective: 'published',
  	public: true
  });
  ```

  `type`/`status`/`revision`/`publishedAt`/timestamps are kept — the admin UI's CAS revision guard and unpublished-changes diffing depend on them, and public pages sometimes display `publishedAt`/`status` themselves. Defaults to `false`, so every existing call site (REST routes, the admin UI, an app's own authenticated reads) is unaffected — this is purely opt-in, applied per-call after any document-cache read/write so the cached payload always stays the full, unfiltered one.

  The starter template (`templates/base`) now sets `public: true` on its homepage's page listing, so new projects see the pattern from the start.

- [#301](https://github.com/IcelandicIcecream/aphex/pull/301) [`1f29e3f`](https://github.com/IcelandicIcecream/aphex/commit/1f29e3f4fdb4acdbc6bf709398564e9a770b5e1c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add search to the admin document list. A magnifying-glass icon in the list toolbar reveals a search box that filters documents server-side (debounced, 300ms) via a new `search` query param on `GET /documents`.

  By default it matches against the schema's configured preview title field plus the conventional `title`/`heading`/`name`/`label`/`slug` fields — the same fields `resolvePreviewTitle` already uses to pick a display title. A schema can opt into explicit control with a new `search?: SearchFieldConfig[]` property (a list of `{ path }` dot-paths), or generate it from every top-level string-ish field with the new `searchableFields(schema)` helper (`@aphexcms/cms-core/schema`):

  ```ts
  const fields = [
  	/* ... */
  ];
  export default defineType({
  	name: 'post',
  	fields,
  	search: searchableFields({ fields })
  });
  ```

  Uses the existing `contains` filter operator (case-insensitive `ILIKE`), so no adapter changes were needed.

## 9.9.0

### Minor Changes

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Close three gaps in the auth surface.

  **API-key revocation now fails closed.** Deleting a key removes the row and evicts the cached
  copy the api-key plugin keeps as secondary storage. If that eviction failed, the row was gone but
  a live key stayed in cache — revocation reported success while the key kept authenticating.
  Eviction now retries three times with backoff and, if it still fails, throws the new
  `ApiKeyRevocationError` (exported as a value, so route handlers can `instanceof` it and tell an
  incomplete revocation from an ordinary delete failure). The caller sees a 500 rather than a false
  "revoked".

  **The password-reset facades are rate-limited.** `POST /api/user/request-password-reset` and
  `/reset-password` call the auth provider _server-side_, and Better Auth's limiter — like its other
  request-shaped guards — only engages for calls carrying a real `ctx.request`. Both endpoints were
  therefore completely unthrottled: one sends email, the other checks tokens, and anyone could reach
  them. Each now has two buckets, because either alone is porous — one on the client address, one on
  the thing an attacker can't rotate freely (the target address, or the token being retried). Every
  bucket is consumed on each request rather than short-circuiting on the first failure, so tripping
  one limit can't keep another permanently fresh.

  `RateLimiter` and `clientAddress` are exported from `@aphexcms/cms-core/server` for apps adding
  their own unauthenticated endpoints. Stated plainly: it is per-process memory, so behind N
  instances the effective limit is N× what's configured and a restart forgets every window. It turns
  "unlimited" into "bounded per instance", which is the difference between an email bomb and a
  nuisance; a deployment needing a hard guarantee should put a limiter in front of the app.

  **API-key deletion is gated on `apiKey.manage`**, the same capability that gates issuing one.
  It previously checked an inline role list that happened to include `editor`, so the two halves of
  the same permission disagreed. **Editors lose the ability to delete API keys** — if you were
  relying on that, grant `apiKey.manage` to the editor role.

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Make the activity page operable, not just observable.

  The job/event history was already there; what was missing was the ability to act on what it
  showed. A dead-lettered job could be read but not restarted, and a stalled relay was invisible —
  the queue simply looked idle, which is exactly what a healthy queue looks like too.
  - **Retry and cancel**, gated on the `org.settings` capability. Both are guarded in SQL rather
    than by a read-then-write: a job another worker leases in between stops matching the `WHERE`
    and the action reports a conflict instead of racing the settle.
  - **Relay backlog banner** — pending outbox count and the age of the oldest unprocessed row.
    This is the "is the worker running?" signal; without it an unrun relay is indistinguishable
    from no work.
  - **Instance-wide scope** for super admins, so a single organization's view isn't the only way
    to find a job.
  - `ActivityView` is exported from `@aphexcms/cms-core/client/ui` (the narrow barrel — it's plain
    fetch and tables, and belongs nowhere near the field-editor chunk).

  **`EventJobAdapter` gained three required methods**, so a third-party adapter will not compile
  until it implements them. Both first-party adapters do.
  - `outboxHealth({ organizationId? })` — backlog size and oldest pending timestamp. Omit the org
    for the instance-wide figure.
  - `getJob(organizationId, id)` — single job read, so a caller can tell "gone" from "not allowed".
  - `requeueJob(organizationId, id, { runAt })` — the operator's undo for a dead letter.

  `requeueJob` is deliberately separate from `retryJob` rather than a reuse of it. `retryJob` is the
  _runner's_ backoff transition and leaves `attempts` untouched; a dead-lettered job sits at
  `attempts === maxAttempts`, so handing it back through that path would only re-exhaust it on the
  next claim. `requeueJob` resets the attempt counter and clears `lastError`, and is restricted to
  `failed` and `cancelled` — requeueing a `pending` job is a no-op and requeueing a `leased` one
  would race its current owner.

### Patch Changes

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`cda2dfd`](https://github.com/IcelandicIcecream/aphex/commit/cda2dfd2f8113d3d423e5acda985410246293353) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add `@aphexcms/auth` — Better Auth instance, session/API-key service, `AuthProvider`, and the
  dialect-split Drizzle tables behind a single `createAphexAuth()` call. Better Auth stays a peer
  dependency, and `betterAuth: (base) => …` remains a full escape hatch.

  Includes:
  - **Two-factor authentication (TOTP)** via `twoFactor: true`. The `two_factor` table and
    `user.two_factor_enabled` ship in the schema unconditionally, so enabling 2FA is a config change
    rather than a migration. The table carries the union of Better Auth 1.5 and 1.6 columns, since the
    supported peer range spans both.
  - **Opt-in OAuth** through `socialProviders`, typed off Better Auth rather than restated, so provider
    option shapes can't drift from the installed version.
  - **Pluggable bootstrap** (`bootstrap`) deciding who claims a fresh instance, with four recipes:
    `openFirstUser()` (the default — first signup wins, as in WordPress, Ghost, Strapi, Payload and
    Dokploy), plus three opt-in hardenings: `claimCode()` (also requires a code printed to the server
    log, which the sign-up form prompts for while `isInstanceUnclaimed(db)` holds), `allowlistEmail()`,
    and `never()`. A recipe carries its own startup work via an optional `policy.prepare(db)`, so
    switching recipes never strands app-level wiring.
  - **`inviteOnly` now defaults to `true`**, and gained a bootstrap exception: sign-up is allowed while
    the instance is _provably_ empty (an adapter that can't answer falls through to the gate rather
    than being waved past). Together with `openFirstUser()` this makes the out-of-the-box flow "the
    first person to sign up owns the instance, and the door shuts behind them" — no public
    registration left open, and nothing to configure. **Breaking** for anyone relying on the previous
    `false` default; opt out with `inviteOnly: false`.

  Bring-your-own-auth is now real rather than nominal. Sign-up gating and bootstrap promotion moved
  into cms-core (`assertSignUpAllowed`, `createUserProfileWithBootstrap`, plus the recipes and
  `isInstanceUnclaimed`), so they're enforced behind the `AuthProvider` port instead of inside Better
  Auth wiring. An app on Keycloak or Supabase now inherits them; previously `inviteOnly: true` would
  be configured and silently do nothing. Bootstrap recipes are imported from `@aphexcms/cms-core/server`,
  not `@aphexcms/auth`.

  Shared predicates replace definitions that had drifted: `isPendingInvitation` / `isExpired` /
  `isAccepted` / `isStaleInvitation` (7 call sites, 3 disagreeing) and `isInstanceEmpty` /
  `canDetermineInstanceEmptiness` (6 call sites carrying the same fail-closed rule by hand).

  The studio now builds auth with `createAphexAuth()`, deleting ~850 lines of duplicated instance and
  service code that had to be patched in parallel.

  Security fixes:
  - **`deleteApiKey` was a stub** that logged and returned `true` without deleting anything. Now issues
    a real delete scoped by owner in the WHERE clause, so one account can't remove another's key by
    guessing its id.
  - **Expired invitations no longer deadlock an address.** The re-invite check tested only `acceptedAt`
    while the sign-up gate and members list also required `expiresAt > now`, so a lapsed invitation was
    simultaneously unusable, invisible in the UI, and blocking any replacement.
  - **API keys can no longer forge tenant or scope.** Key metadata is client-writable via Better Auth's
    own `/api-key/create`, but was previously trusted for `organizationId`, `permissions`, and
    `capabilities`. It's now treated as a claim: the owner's membership is re-checked per request, and
    grants are clamped to what that owner's role actually confers.
  - **Bootstrap no longer fails open.** `hasAnyUserProfiles` is optional on the adapter interface, and a
    missing implementation previously read as "no users exist", promoting every signup to super admin.
  - **Cross-collection access is blocked** in `CollectionAPI`: permissions are checked against the
    addressed collection while lookups were keyed on the globally-unique document ID, letting a caller
    reach a known ID in a restricted collection. A type mismatch now reports "not found".
  - **Organization settings** evaluate capabilities against the target organization rather than the
    caller's active one.

- Updated dependencies [[`200e7ab`](https://github.com/IcelandicIcecream/aphex/commit/200e7abe6809251d48f72c11872d1caa8700a002), [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903)]:
  - @aphexcms/ui@0.8.5

## 9.8.1

### Patch Changes

- [#295](https://github.com/IcelandicIcecream/aphex/pull/295) [`5001d85`](https://github.com/IcelandicIcecream/aphex/commit/5001d855d124e6ed8805ce0015db8a59b4946265) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix a runtime import that broke every document write, publish, version restore, and agent change-set request in 9.8.0: `Failed to load url ../../../db/interfaces.js`.

  Four route modules imported `RevisionConflictError` from the **directory** `'../../../db/interfaces'` rather than `'../../../db/interfaces/index'`. The build rewrites a bare specifier by appending `.js`, producing `db/interfaces.js` — a file that doesn't exist, since the directory ships as `db/interfaces/index.js`. Inside the monorepo the same import resolves fine (the bundler finds the directory's index), so this only ever surfaced in a real install from the published tarball.

  Type-only imports of the same path were unaffected — they're erased at compile time and never emit a specifier — which is why this landed with the compare-and-swap work: `RevisionConflictError` is the first _value_ imported from that directory by a route, so it's the first one to emit a runtime import.

  Fixed in `documents-by-id.ts`, `documents-publish.ts`, `document-versions.ts`, `agent-change-sets.ts`, and normalized `services/references-service.ts` to the same `db/interfaces/index` form the rest of the package already uses.

## 9.8.0

### Minor Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an audit/undo trail for the in-admin AI assistant's writes — `cms_agent_change_sets` (one row per agent turn, capturing `provider`/`model`/`promptTokens`/`completionTokens` for cost/usage auditing regardless of whether the turn mutated anything) and `cms_agent_operations` (one row per mutating tool call, with the document-version numbers an undo restores between).
  - New `AgentChangeSetAdapter` port (`createChangeSet`/`recordOperation`/`completeChangeSet`/`getChangeSet`/`listChangeSets`), implemented in both relational adapters, mirroring the `EventJobAdapter`/`cms_domain_events` schema pattern (org-scoped, RLS on Postgres, WHERE-scoped on SQLite) — proven identical across dialects by the cross-dialect conformance suite.
  - `POST /api/agent/chat` now eagerly creates a change-set per turn and records every mutating tool call against it, best-effort (a recording failure never breaks the chat itself).
  - New `POST /api/agent/change-sets/:id/undo` reuses the existing CAS-guarded `VersionService.restoreVersion` — the same primitive the document editor's own version-restore already calls — so undo is not new revert logic, just "restore to the version before this operation," applied in reverse order. Known limitation: `create_document` operations aren't undoable (no delete primitive wired in), and undo never auto-unpublishes.
  - `ActivityView.svelte` gains an "Agent Changes" tab: change-set list with provider/model/token counts, expandable per-turn operation detail, and an Undo button.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`58d92a8`](https://github.com/IcelandicIcecream/aphex/commit/58d92a854d6bde5204d1415cf25f301d85ae1983) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the streaming transport for the in-admin content agent (Milestone 2 item 5 of `references/content-copilot-phase-1-plan.md`), built on the already-typechecked `AIProviderAdapter` port:
  - `types/agent-stream.ts` — `AgentStreamEvent`, the browser-facing wire contract (`AIStreamEvent` plus a `toolResult` event carrying an executed tool's outcome).
  - `ai/run-agent-turn.ts` — `runAgentTurn`, a transport-agnostic tool-calling loop: streams the model's response, executes requested tool calls against the caller's resolved tool list (re-checking `requiredCapabilities` at execution time, not just at advertisement), feeds results back as `tool` messages, and repeats until the model stops or a `maxToolRoundtrips` safety cap (default 8) is hit.
  - `POST /api/agent/chat` — session-authenticated SSE endpoint (mounted on the shared `apiApp`, so no per-app route re-export is needed, unlike MCP), 404s when no `aiProvider` is configured, streams `AgentStreamEvent`s built on `runAgentTurn`. Stateless per call; conversation persistence is not part of this change.
  - `mcp/tools.ts` exports `resolveAgentTools` (extracted from `buildContentTools`) — the one shared, capability-filtered tool-resolution path both MCP and this new endpoint use, so they can never drift on what a caller is allowed to see or invoke.
  - `CMSConfig` gains `agentModel?: string`, the default provider-specific model id the chat endpoint uses when a request doesn't override it.

  Not yet done: runtime-testing against a live provider API key, and wiring an `aiProvider` into `apps/studio/aphex.config.ts` (a separate app-level decision).

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add chunk-load/hung-navigation recovery, importable as `@aphexcms/cms-core/chunk-recovery` — a standalone, zero-dependency module for a public-facing site's `hooks.client.ts` (plus its root `+layout.svelte`) that masks a transient CDN/proxy hiccup — a dropped connection to the origin, or a stale cached HTML document referencing a since-replaced hashed filename — that would otherwise leave a visitor stuck on an unresponsive page. Three distinct gaps, three functions:
  - `installChunkLoadRecovery()` — the _initial_ hydration path: if the entry module itself fails to load, a `window` listener reloads the page once.
  - `handleChunkLoadClientError(error, destinationUrl?)` — a failed client-side _navigation_ (clicking a link to a lazily-loaded route) is caught by SvelteKit's router internally and routed through `handleError` instead, never becoming a global `window` event — confirmed live via a real "click a link, nothing happens" report. Reloads straight to `destinationUrl` (pass `event.url` from `HandleClientError`) rather than the current address, since SvelteKit doesn't update the address bar until a navigation resolves.
  - `installNavigationTimeoutRecovery(timeoutMs = 4000)` — both of the above only fire once SvelteKit/the CDN has already decided the navigation failed, which can ride on a slow gateway timeout (observed live: ~90s on an actual 522). Pre-empts that by forcing a hard navigation to the destination if a client-side navigation hasn't finished within `timeoutMs`, instead of leaving a visitor watching a dead click for a minute-plus. Must be called during a `.svelte` component's initialization (root `+layout.svelte`), not from `hooks.client.ts`.

  Guarded to reload/navigate at most once per session across all three, so a genuinely down origin doesn't loop. Deliberately not exported from `/client`: that barrel pulls in the admin UI component tree, and this needs to stay light enough for the hottest of hot paths — every visitor's initial page load. Wired into `apps/studio` and both `templates/base`/`templates/blog` as the reference usage.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the workspace bridge for the in-admin content agent (Milestone 3 of `references/content-copilot-phase-1-plan.md`) — lets the agent edit the document a user currently has open in `DocumentEditor.svelte`, buffered against the live editor state and flushed as a single CAS-guarded save, instead of only being able to write straight to the DB.
  - `types/document-workspace.ts` — the `DocumentWorkspace` interface (`getSnapshot`/`apply`/`validate`/`flushSave`/`publish`/`beginBatch`/`endBatch`) a live document session exposes; deliberately shaped as "a live handle onto a document's editable state" rather than "what the AI needs," so a future multiplayer feature can reuse the same primitives.
  - `document-workspace-registry.svelte.ts` — module-level singleton (same pattern as `agent-chat-state.svelte.ts`) tracking which document sessions are currently open in this tab.
  - `ai/content-workspace-tools.ts` — `content_patch_fields`/`content_save_draft`, both `execution: 'workspace'`; their `execute` bodies are unreachable by design, since `run-agent-turn.ts`'s pause branch guarantees they're never called server-side.
  - `ai/run-agent-turn.ts` — partitions a round's tool calls by `execution`, runs `server`-mode calls as before, and pauses (`finishReason: 'awaiting_workspace_tool'`) instead of executing `workspace`-mode calls, leaving them for the client to resolve against the registered `DocumentWorkspace` and resume.
  - `mcp/tools.ts`'s `resolveAgentTools(deps, opts?)` gains an optional `{ documentContext }` param: appends the two workspace tools only when a document context is present, and **removes `update_document` from the list** in that case — a document open in the editor now has exactly one write path (the workspace tools), not a prompt-level preference the model could still bypass.
  - `DocumentEditor.svelte` builds a `documentWorkspace` object and registers it on mount; `AgentChat.svelte` cross-checks it against the URL's `docType`/`docId` before attaching `documentContext`, resolves paused tool calls, and auto-flushes via `content_save_draft` if the model applied patches but never explicitly saved.
  - `document-refresh.svelte.ts` gains `getCollectionVersion`/`notifyCollectionChanged` (sibling to the existing per-document version pub/sub) so a collection **list** view refreshes after the agent creates/updates/publishes a document elsewhere in the session; `AdminApp.svelte` debounces the refetch (300ms) so a bulk agent operation doesn't fire one refetch per document.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`657db9e`](https://github.com/IcelandicIcecream/aphex/commit/657db9e3ec1f2251bc98fd2e132616a050545d6e) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix the missing publish controls on a referenced document opened in presentation (visual-editing) mode, make a list row's edit marker point at the row rather than the whole field, and raise the reference picker's search ceiling.

  **cms-core**
  - `AdminApp.svelte`: the primary editor's wrapper is now `overflow-y: hidden` in presentation mode. The stacked reference panel is an `absolute inset-y-0` sibling inside that wrapper, and for a _scroll container_ the containing block of an absolute child is the padding box — the whole scrollable extent, not the visible height. With `auto` the panel stretched to the scroll height and pinned its footer (Publish / Schedule / Unpublish) below the fold, so a referenced document looked like it had no publish controls at all; the bar visible at the bottom of the window was the base editor's showing through. Nothing is lost by disabling it there: in presentation mode `DocumentEditor` is `h-full overflow-hidden` and scrolls its own field column.
  - `DocumentEditor.svelte`: new `hideActionBar` prop, set by `AdminApp` on the base document while a reference panel is stacked over it in presentation mode. Two action bars in the same corner give no clue which document each one publishes. Hides the bar only — the document keeps auto-saving and its status stays in the header. Not applied to the ordinary side-by-side stacked panel, where each bar already sits under its own column.
  - `ReferenceField.svelte`: the reference picker fetches 200 documents instead of 20. The picker filters client-side over that cache, so the fetch limit was also the search limit — anything beyond it could never be found by typing, making documents silently unreachable in any collection larger than a screenful (a menu of 36 dishes could only ever surface the first 20). This raises the ceiling rather than removing it; collections beyond 200 still need server-side search, which the list endpoint doesn't expose today.
  - `ArrayField.svelte`: array rows now carry `data-array-index`, the DOM hook the visual editor reads to resolve a click to a specific row.

  **visual-editing**
  - `PreviewApi` gains `documentType` — the schema type currently open in the editor, or `null` outside preview. It's how a page reachable from several document types picks what a click should do.
  - `edit()` accepts `{ field, arrayIndex }` to target a field, or a specific row of it, in the open document, rather than only another document by `{ id, type }`. Revealing the row is what lets an author reorder or remove it, which opening the referenced document does not.
  - The hover overlay's label appends `[n]` for a list entry. Several rows of one list otherwise all read as the same bare field name, with nothing to say which slot is which.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`64706f9`](https://github.com/IcelandicIcecream/aphex/commit/64706f9d334085e61e51d7ca0a42664f448a51bc) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Reframe the 14 built-in MCP content tools onto the new `AgentToolDefinition`/`AgentToolExecutor` contract (Milestone 2 of `references/content-copilot-phase-1-plan.md`) — same tool behavior, but now defined once as a static `contentAgentTools` array (each a `{ definition, execute }` pair, `execute` receiving services as a call-time argument rather than a per-request closure) instead of being rebuilt fresh on every MCP connection. `buildContentTools()` is now a thin adapter from this list into the MCP SDK's expected shape, so this is purely an internal reframing — the MCP route and every tool's external behavior are unchanged. Sets up the same tool list to eventually serve a future in-admin agent panel through one shared execution path, per the plan's ownership boundary.

  `buildContentTools()` also now merges in plugin-contributed `aphex/agent/tool` parts via `partResolver.agentToolsForCapabilities()`, filtered by the calling API key's resolved capabilities — a plugin's own tool is reachable over MCP without any app-level wiring, matching how `aphex/event/consumer`/`aphex/job/handler` already self-register. A core tool name always wins a collision with a plugin tool. This closes the last open item under Milestone 2's tool-reframe step.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add compare-and-swap (CAS) concurrency control for document writes — Milestone 1 of the content-copilot plan (`references/content-copilot-phase-1-plan.md`), and useful on its own: two browser tabs open on the same document no longer silently clobber each other.
  - `cms_documents` gains a monotonic `revision` column, incremented on every draft write.
  - `updateDocDraft`/`publishDoc`/`unpublishDoc` (both adapters) and `VersionService.restoreVersion` accept an optional `expectedRevision`; a mismatch throws `RevisionConflictError` (`documentId`/`expectedRevision`/`currentRevision`) instead of overwriting. Omitting `expectedRevision` preserves the previous unconditional last-write-wins behavior — fully backward compatible.
  - Threaded through `CollectionAPI.update`/`publish`/`unpublish`, the zod request/response schemas (`expectedRevision` in, `revision` out via `_meta`), and the HTTP routes (`RevisionConflictError` → 409 with `currentRevision`).
  - `DocumentEditor.svelte` sends the revision it last read on autosave, publish, unpublish, and version-restore, and surfaces a 409 distinctly ("this document was changed elsewhere, reload") instead of a generic save error or a silent overwrite.
  - Fixed a gap the cross-dialect conformance suite caught: `PostgreSQLAdapter`/`SQLiteAdapter`'s org-hierarchy wrapper (the class `apps/studio` actually talks to) wasn't forwarding `expectedRevision` to the underlying document adapter, so CAS would have been a no-op end-to-end despite being correctly implemented one layer down. Fixed by threading the parameter through a shared `withHierarchyFallback` helper (also de-duplicating four near-identical hierarchy-retry blocks per adapter).
  - New cross-dialect conformance coverage (`packages/sqlite-adapter/tests/conformance.spec.ts`, run against both pglite and libsql): revision incrementing, the two-tabs stale-write rejection, publish/unpublish CAS, and unconditional-write-still-works-when-omitted.

### Patch Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`1771663`](https://github.com/IcelandicIcecream/aphex/commit/1771663f2197648e9b20b75871bf87de6d9dae3a) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix array fields silently accepting malformed items. Two gaps, both closed:
  - Schema-definition validation now rejects an `array` field declared with no
    `of` (or an empty `of`) instead of passing it clean.
  - Document-data validation now actually validates array items against `of` —
    previously `validateValueShape`'s `'array'` case only confirmed the value
    _was_ an array and never inspected item shape, so a mistyped or malformed
    item (wrong `_type`, missing required nested fields, a string where an
    object was declared) passed validation silently regardless of whether `of`
    was well-formed. Item resolution mirrors `ArrayField.svelte`'s own matching
    (`ref.name === item._type || ref.type === item._type`, falling back to the
    sole entry only for untagged items in a single-type array — an item
    carrying an explicit, unrecognized `_type` is always an error, never
    silently coerced). Inline object items recurse into their own `fields`, so
    arbitrarily nested arrays-of-objects-with-arrays validate at every depth,
    with a clean dotted/bracketed error path (e.g.
    `sections[0].items[2].label`) rather than repeated wrapping.

  Also fixes `ArrayField.svelte` and the exported `isBlockArray` helper
  throwing when `field.of` is missing, instead of the previous inconsistency
  (admin UI crash vs. silent API accept for the same malformed schema).

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix a missing authorization check on the MCP `list_assets`/`upload_asset` tools — unlike every other document tool (which run through `CollectionAPI`, permission-checked transitively), these two called `assetService.findAssets`/`uploadAsset` directly with no capability check, so an API key without `asset.read`/`asset.upload` could still list or upload assets via MCP. Both tools now require the matching capability, returning a forbidden error otherwise — same as the HTTP asset routes.

- [#292](https://github.com/IcelandicIcecream/aphex/pull/292) [`0108350`](https://github.com/IcelandicIcecream/aphex/commit/0108350f2eee7d89651fc4e89a8140ba49c1b646) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix three admin/type-gen bugs found while building out a client project's plugins:
  - `type-gen`'s esbuild pass (used to compile+import `aphex.config.ts` outside
    Vite) now stubs `$env/*` imports to an empty object instead of failing the
    whole build — a plugin/schema module importing `$env/dynamic/public` (or
    any other `$env/*` variant) just to read a default config value no longer
    breaks type generation.
  - `ObjectModal`'s title now falls back to a title-cased `schema.name` when a
    nested object schema (e.g. an array item type) has no `title` set, instead
    of rendering `Edit undefined`.
  - `ObjectModal`'s panel now sets `cursor-default`, overriding a `cursor:
pointer` that could otherwise inherit onto the whole modal from an app-level
    `[role="button"]` cursor rule matching the modal's backdrop.
  - Click-to-edit stega encoding and the array item click target now resolve
    named object-type references (e.g. `{ type: 'doctorGridBlock' }`) from the
    schema registry, not just inline `fields`, so page-builder block items are
    clickable in the live preview.

## 9.7.0

### Minor Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`20b10c5`](https://github.com/IcelandicIcecream/aphex/commit/20b10c53987605fd8e3cb77156eb6b2753fed6d0) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the durable event + job spine (Phase 1): an append-only domain-event log, a DB-backed job queue, and a transactional outbox — all cross-dialect (Postgres/pglite/SQLite).

  **cms-core**
  - `withTransaction` is now **required** on `DatabaseAdapter` (was optional). Both first-party adapters already implement it; this removes the non-atomic fallbacks in `VersionService`. Custom adapters must implement it.
  - New `EventJobAdapter` port on `DatabaseAdapter`: `appendEvent` / `getEvent` (append-only event log) and `scheduleJob` / `claimDueJobs` / `completeJob` / `retryJob` / `failJob` (job queue with leases + idempotency keys). Callable on the tx handle from `withTransaction`, so emitting an event or scheduling a job is atomic with the state change that caused it (transactional outbox).
  - `defineEvent(type, zodSchema)` — a typed event catalog helper (mirrors the API-contract pattern), plus the built-in `document.published` definition. New universal types: `DomainEvent`, `Job`, `AppendEventInput`, `ScheduleJobInput`, `ClaimJobsOptions`, etc.
  - `create({ publish })` is now atomic: create + draft snapshot + publish + publish snapshot commit in one transaction instead of four separate implicit ones. `document.published` is emitted inside the publish transaction on every versioned publish path.
  - **Job worker:** `runDueJobs()` — claims a bounded batch of due jobs, runs each type's registered handler, and settles it (complete / retry with exponential backoff + jitter / dead-letter after `maxAttempts`). Handlers and a shared `workerSecret` are configured via `CMSConfig.jobs`. A secret-gated `POST /api/internal/workers/run` endpoint drives one batch (404 when no secret is set, so it's never an unauthenticated surface by default); platform cron or a self-hosted poll loop calls it on a cadence.
  - **Scheduled publish/unpublish:** built-in `document.publish` / `document.unpublish` job handlers, plus `collection.schedulePublish()` / `scheduleUnpublish()` (Local API) and `POST /api/documents/:id/schedule`. Scheduling is permission-checked at schedule time; the job re-runs `publish()` at `runAt` (re-validating + guarding references), so invalid content fails/retries instead of publishing, and `document.published` is emitted on the scheduled path exactly like a manual publish. **Replace semantics**: scheduling replaces any existing pending schedule for the document (at most one → no accidental double-publish), and `runAt` is floored to the minute. The editor has a calendar+time schedule dialog and a banner under the title ("Scheduled to be published on Monday at 8:00 AM") with reschedule/cancel, backed by `GET`/`DELETE /api/documents/:id/schedule` and the adapter `cancelJob` method.
  - **Read-only history / observability:** `listEvents` / `listJobs` adapter methods + `GET /api/events` and `GET /api/jobs` (gated on `document.read`, paginated, filterable by type/status), surfaced in a top-level **Activity** admin view (`ActivityView`). Jobs and the domain-event log are queryable rows in your own DB — no external store.

  **postgresql-adapter / sqlite-adapter**
  - New `cms_domain_events` and `cms_jobs` tables (organization-scoped; RLS policies on Postgres, `WHERE`-based isolation on SQLite), and the `EventJobAdapter` implementation. **Requires a migration** on Postgres (`drizzle-kit generate` + `migrate`); SQLite picks the tables up via push-on-boot.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an embedded in-process job runner (`config.jobs.embedded`) — a third way to
  drive the queue alongside platform cron and the self-hosted poll loop. It calls
  `runJobsBatch` on an interval from inside the running app (no HTTP endpoint, no
  worker secret), so scheduled publishes and event consumers run with zero setup.
  Ideal for local dev and single-instance self-hosting; ticks never overlap and a
  failing tick is logged and swallowed so the loop survives transient errors.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Event consumers now receive the configured `emailAdapter` in their context, so a
  consumer can send notifications (e.g. a form's "new submission" email) durably
  and out of band. `FormDefinition` also gains an optional `notifyEmail` for
  per-form notification routing.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a generic plugin storage primitive — `cms_plugin_storage`, the data-plane
  sibling of `cms_plugin_settings`. Plugins persist arbitrary org-scoped JSON
  records namespaced by `(plugin, collection)` through the new
  `PluginStorageAdapter` port (`createPluginRecord` / `getPluginRecord` /
  `listPluginRecords`), implemented by both the PostgreSQL and SQLite adapters.
  `createPluginRecord` is callable on the `withTransaction` handle, so a record
  and the domain event announcing it commit atomically (transactional outbox).

### Patch Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - The `datetime` field validator now accepts canonical ISO-8601 (e.g.
  `new Date().toISOString()`) in addition to `YYYY-MM-DD HH:mm`, so a
  `beforeValidate` hook that stamps an ISO timestamp no longer fails validation.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Scheduling refinements. The schedule button now mirrors the Publish button's
  state (disabled when there are no unpublished changes), and a manual
  publish/unpublish cancels any pending **same-direction** scheduled job — so the
  queue can't fire a late duplicate and re-emit `document.published` /
  `document.unpublished`. An opposite-direction schedule is left intact.

## 9.6.0

### Minor Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`3cab505`](https://github.com/IcelandicIcecream/aphex/commit/3cab505c0d471ef2f7ddc028bf0c6cbbe6116d08) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a narrow `@aphexcms/cms-core/client/api` entrypoint that exports only the
  API client functions (no Svelte components). Importing anything from the main
  `@aphexcms/cms-core/client` barrel pulls the entire admin UI graph — including
  the TipTap rich-text editor and @dnd-kit — into that route's chunk (~1.18 MB
  min / 328 kB gzip), even for a page that only calls an API function.

  Non-breaking: the existing `/client` barrel is unchanged. Utility pages that
  only need the API (e.g. an invitations screen, god-mode) can repoint their
  import to `/client/api` to drop the editor bundle from that route:

  ```diff
  -import { invitations, organizations } from '@aphexcms/cms-core/client';
  +import { invitations, organizations } from '@aphexcms/cms-core/client/api';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`c14d1c1`](https://github.com/IcelandicIcecream/aphex/commit/c14d1c19e5ad9303e74a291e8e62f081969237e3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a `@aphexcms/cms-core/client/ui` entrypoint: the admin chrome and context
  primitives (Sidebar, ConfirmDialog, permissions/schema/slots/nav contexts,
  PluginSettingsPanel, API client, toast) without the document editor or field
  widgets.

  The full `/client` barrel also re-exports DocumentEditor, SchemaField, AdminApp
  and every `*Field` component, which pull the field registry (+@dnd-kit, +lucide)
  into one chunk (~337 kB min / ~110 kB gzip). Because Rollup's download unit is
  the chunk, a page that only wants a Sidebar or a confirm dialog still downloaded
  that whole chunk just by sharing the barrel.

  Non-breaking: `/client` is unchanged. Admin pages that don't mount the editor
  (settings, members, roles, plugins, organizations, god-mode) can import from
  `/client/ui` to drop the field registry from their initial load. Only the route
  that mounts `AdminApp`/`DocumentEditor` needs the full `/client`.

  ```diff
  -import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client';
  +import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client/ui';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f898e3e`](https://github.com/IcelandicIcecream/aphex/commit/f898e3e092a2d948a996dfe0e567aefcfb118719) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add schema lifecycle hooks and a typed `defineType` authoring helper.
  - `hooks.beforeValidate` on a schema — save-time transform functions that run on every write path (Local API `create`/`update`, HTTP API, admin UI) before field validation. Use them to normalize or derive input (trim, slugify, stamp, default). Hooks are transform-only by design: rejection and cross-field invariants stay in `validation: (Rule) => Rule.custom(...)`, and side effects belong in domain-event consumers — never in a hook.
  - `defineType(schema)` — an optional, backwards-compatible wrapper that captures the exact `fields` literal via a `const` type parameter, so `beforeValidate` hooks receive a `data` typed by self-reflection from the schema's own fields — no generated types, no casts. Plain `const x: SchemaType = { ... }` objects keep working unchanged.
  - Cross-field validation: `validateDocumentData` now populates `context.document` (the whole document) for `Rule.custom((value, { document }) => ...)`, matching the `ValidationContext` type. The document is built internally from the data being validated, so callers no longer pass it redundantly.

### Patch Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f798ed3`](https://github.com/IcelandicIcecream/aphex/commit/f798ed3975c0279eb5ee99ba0af6a4490f190c7d) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Lazy-load the rich-text (TipTap) editor. `ArrayField` now dynamically imports
  `RichtextField` only when a field's `of` actually contains `{ type: 'block' }`,
  so the ProseMirror/TipTap bundle (~393 kB min / 122 kB gzip) is split into its
  own async chunk instead of riding in the shared admin chunk.

  Effect: every admin page that doesn't render a rich-text editor — settings,
  members, roles, api-keys, and document editors whose schema has no block field —
  no longer downloads TipTap up front. It loads on demand the first time a
  rich-text field is shown. No API or behaviour change.

## 9.5.2

### Patch Changes

- [`2cc2657`](https://github.com/IcelandicIcecream/aphex/commit/2cc2657e9be58d5709166cc2e19ebd9a73382447) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix `generate:types` failing on plugins that import named icons

  The esbuild stub that strips `@lucide/svelte` out of the type-generation
  bundle was an ESM module exporting only a default. esbuild validates ESM named
  imports against the target module's exports, so any plugin doing
  `import { Sparkles } from '@lucide/svelte'` — which `@aphexcms/plugin-seo` does
  — failed the bundle with:

      No matching export in "lucide-stub:@lucide/svelte" for import "Sparkles"

  The stub (and the `.svelte` component stub, which has the same problem) now
  emits CommonJS. Named imports off a CJS module are resolved as property access
  rather than statically validated, so every icon name works and yields
  `undefined` — which is what the existing `icon:` rewrite wants anyway.

## 9.5.1

### Patch Changes

- [#273](https://github.com/IcelandicIcecream/aphex/pull/273) [`2b66bd4`](https://github.com/IcelandicIcecream/aphex/commit/2b66bd42126e1dc8894d68dae3d4bb353657ddaf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix broken build in consuming apps: `@aphexcms/cms-core` shipped `dist/mcp/tools.js` importing `../../cli/generate-types.js`, a path that escapes the `dist` tree and fails to resolve in any consuming app (`Could not resolve "../../cli/generate-types.js"`). The shared type-shape logic (`mapFieldTypeToTS`/`fieldWriteShape`, plus the `generateTypesFromConfig` wrapper) now lives in core at `src/lib/type-gen.ts`, so `lib` no longer reaches up into `src/cli`. The `aphex` CLI bin is unchanged and imports the logic from core.

## 9.5.0

### Minor Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin capabilities now reach owners, and settings honour their own gate

  Two gaps in how plugin-declared capabilities integrate with the role model.

  `owner` was seeded from `ALL_CAPABILITIES`, which is core-only, so an owner could not
  hold a capability declared by an installed plugin — leaving owner with strictly fewer
  permissions than an `admin`, who can be granted one through the roles UI. The engine
  now derives owner's set from the merged capability catalog (core built-ins plus every
  plugin-declared capability) and passes it to `seedBuiltinRoles`, which takes an
  optional `ownerCapabilities`. Because the boot reconcile re-seeds every org,
  installing or removing a plugin is enough to bring owners in line. New orgs seed the
  same way, so a freshly created org's owner isn't missing its plugins' capabilities
  until the next restart.

  `hasCapability` accepted only the closed core `Capability` union, so checking a
  plugin-declared capability didn't type-check. It now takes `Capability | (string &
{})`, keeping autocomplete for built-ins while admitting plugin ids.

  `SettingsPart.requiredCapabilities` was documented as a way to "gate a specific
  plugin's settings more tightly" but was read nowhere: every plugin's settings were
  reachable by anyone holding `plugin.settings.manage`. It is now enforced on both
  `GET /api/plugin-settings` (which filters declarations, so the admin panel hides what
  you can't manage) and `PUT /api/plugin-settings/:pluginId`. Reads were already masked,
  so the exposure this closes is write: overwriting the secrets of a plugin that asked
  for a narrower capability.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin system: declare schemas, routes, capabilities and admin UI from a package

  `definePlugin` plus a discriminated-union `PluginPart` and a part resolver let a
  package contribute to the CMS without the app wiring each piece by hand. Parts
  cover schemas and schema transforms, server routes, capabilities, document
  actions, admin tools, field components, and settings.

  Parts split across two planes: serializable parts the server engine ingests via
  `aphex.config.ts`, and component parts the admin imports directly (they can't
  cross a SvelteKit `load`). A Vite plugin handles auto-discovery.

  `aphex/server/route` parts must declare `requiredCapabilities` — there is no
  default, because none is right for both a webhook receiver and an admin-only
  export. `['forms.export']` requires authentication plus those capabilities, `[]`
  requires only authentication, and `'public'` opts out of the gate entirely. The
  CMS enforces this at mount, before the handler runs, so a plugin route is never
  accidentally open: omitting the field doesn't type-check, and exposing a route to
  the internet is a word you have to write.

  Also adds a theme module (`theme/`) exporting tokens, schemes and derivation, and
  an `AdminArea` type for extending the admin shell.

  This is additive — existing configs keep working without declaring any plugins.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Schema transforms no longer drop access control, validation, or groups

  `{ type: 'color' }` and `{ type: 'seo' }` are desugared into real object fields by a
  schema transform. Both transforms rebuilt the field from a hand-picked subset of its
  properties — `name`, `title`, `description`, `group` — which silently discarded
  everything else the author wrote. A field declared with `access` came out of the
  transform **unrestricted**; `validation` was dropped; and `group: ['design',
'general']` collapsed to just `'design'`.

  Adds `desugarFieldType` to cms-core, which owns the tree walk (nested objects, array
  members) and layers the authored field back over the built one, so preservation is
  the default rather than something each plugin re-implements and gets wrong. The
  builder declares only the shape it owns; `sugarKeys` names the properties that exist
  solely on the sugar type (color's `alpha`, which becomes `inputOptions.alpha`) so
  they don't survive onto the expanded field. A property added to `BaseField` later is
  carried through automatically.

  Both plugins now use it, which also removes the duplicated `groupOf`/`expandFields`/
  `expandMember` recursion from each of them.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Reconcile built-in roles on boot so `owner` picks up new capabilities

  Built-in roles were seeded once, at organization creation, with
  `onConflictDoNothing`. That is correct for creation but means an org seeded
  before a capability existed never learns about it: the row is already there, so
  the conflict clause skips it. Upgrading core silently left owners without newly
  added permissions — `plugin.settings.manage` was invisible to owners of existing
  orgs.

  `owner` is now treated as an invariant rather than a default floor. It is defined
  as the whole of `ALL_CAPABILITIES`, so `seedBuiltinRoles` reconciles it to that
  set, and `CMSEngine.initialize()` re-seeds every organization on boot.
  `admin`/`editor`/`viewer` are deliberately left untouched — they are editable, and
  force-adding a capability could re-widen access an operator narrowed on purpose.
  No role ever gains a permission automatically except `owner`, which by definition
  already holds every one.

  `PATCH /api/roles/owner` now rejects capability edits with a 403: the boot
  reconcile would revert them at the next restart, so accepting the write would be
  a lie. This mirrors the existing block on deleting built-in roles. Custom roles
  remain the way to grant narrower access.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Per-organization plugin settings, with encrypted secrets

  A plugin declares its settings shape via an `aphex/settings` part; core renders
  the form, stores values per organization, and injects them into the plugin's
  server code. Storage is a generic `cms_plugin_settings` table keyed by
  (organization, plugin) — adding a plugin never means a migration.

  Fields typed `'secret'` are encrypted at rest with AES-256-GCM under a versioned
  `v1:iv:tag:ciphertext` envelope, so the key can be rotated later without
  guessing at old values. Set `APHEX_SECRET_ENCRYPTION_KEY` to enable them; saving
  a secret without it fails loudly rather than writing plaintext.

  Secrets never reach the browser: the API serves masked values, and the decrypting
  accessor is server-only. Submitting a blank or masked field leaves the stored
  secret untouched, so a round-trip through the form can't wipe it.

  `SecretField` is deliberately not part of `FieldTypeMap` — `Field` derives from
  that map, so adding it there would let `'secret'` leak into content schemas.
  Settings are config, not content.

  `SettingsField` is a narrow subset — `string`, `text`, `number`, `boolean` and
  `secret` — rather than the whole content `Field` union: that's exactly what the
  panel renders and the service validates, so a declaration can't promise a widget
  (an `image`, a `reference`) that would fall through to a bare text input and store
  nonsense.

  Submitted values are validated against the declaration on save, so plugin server
  code can trust what it's injected instead of re-guarding every read. A `number`
  field rejects `"3"`, a `string` with a `list` rejects an undeclared option, and an
  invalid patch is refused whole with a 400 and its issues rather than being applied
  in part.

  Gated behind a new `plugin.settings.manage` capability.

### Patch Changes

- Updated dependencies [[`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/ui@0.8.3

## 9.4.0

### Minor Changes

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - `aphex migrate` now supports SQLite (libsql) as a third driver alongside Postgres and pglite. Detection: `APHEX_DATABASE=sqlite` or a `DATABASE_URL` starting with `file:`/`libsql:`. Remote (Turso) databases use `DATABASE_AUTH_TOKEN`.

### Patch Changes

- [#270](https://github.com/IcelandicIcecream/aphex/pull/270) [`53f3209`](https://github.com/IcelandicIcecream/aphex/commit/53f32098b7f837263ef92a61208511569ad39654) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Sanitize schema names with hyphens in GraphQL identifiers. A schema type named `blog-post` produced an invalid GraphQL identifier, since the spec only permits `[_A-Za-z][_0-9A-Za-z]*`. Type, field, union, and object names are now normalized through shared `toPascalCase` / `toCamelCase` helpers (`src/lib/utils/string-case.ts`), which handle hyphens, underscores, and camelCase boundaries consistently across the GraphQL schema builder, the resolvers, and `generate-types`.

  Thanks [@ChristopherSO](https://github.com/ChristopherSO) — [#267](https://github.com/IcelandicIcecream/aphex/pull/267).

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`21dc2dc`](https://github.com/IcelandicIcecream/aphex/commit/21dc2dcd2c706870615de4017476562a8f40ffef) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Silence a Vite SSR warning from `generate-types`. The CLI dynamically imports the consumer's schema module by a path resolved at runtime, which Vite cannot statically analyze — the import is now marked `/* @vite-ignore */`, so pulling this file into a dev bundle no longer logs "The above dynamic import cannot be analyzed by Vite."

## 9.3.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a built-in MCP server so coding agents (Claude Code, Cursor) can read and build content over an org-scoped API key. Ships with the package via a re-exportable SvelteKit route (`@aphexcms/cms-core/routes/mcp`) using the official `@modelcontextprotocol/sdk` over Streamable HTTP (`@hono/mcp`), plus a transport-agnostic tool registry (`buildContentTools`). Tools derive their schema/field-type knowledge from the real validators and run under the caller's RBAC + RLS scope. Also includes richtext/portable-text editor fixes.

## 9.2.2

### Patch Changes

- auto generate types via vite plugin & data normalization bug fix for richtext

## 9.2.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/ui@0.8.1

## 9.2.0

### Minor Changes

- allow multi-line code for richtext

## 9.1.0

### Minor Changes

- Add rich text block

## 9.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- [#243](https://github.com/IcelandicIcecream/aphex/pull/243) [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494) Thanks [@ChristopherSO](https://github.com/ChristopherSO)! - Fix the Vite dayjs ESM plugin alias on Windows by handling backslash-separated resolved paths.

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01)]:
  - @aphexcms/ui@0.8.0

## 8.1.0

### Minor Changes

- fixed reference and version ui bug

## 8.0.0

### Minor Changes

- better reference fields !

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.7.0

## 7.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.6.0

## 6.0.0

### Minor Changes

- FIXED UP MODAL SHITS>

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.5.0

## 5.1.0

### Minor Changes

- added a bunch of fixes

## 5.0.6

### Patch Changes

- Added vite plugin for HMR - upgradable

## 5.0.5

### Patch Changes

- add optimizations

## 5.0.4

### Patch Changes

- security and opptimization fixes

## 5.0.3

### Patch Changes

- Update to allow singleton support

## 5.0.2

### Patch Changes

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

## 5.0.1

### Patch Changes

- UPDATE SMALL BUGS AND FIXED TYPE GENN"

## 5.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.4.0

## 4.0.0

### Major Changes

- Fix up client exports

## 3.0.0

### Major Changes

- [`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - remove subpaths for .svelte

## 2.1.2

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/ui@0.3.4

## 2.1.1

### Patch Changes

- Add the `svelte` export condition to every subpath export (`./client`,
  `./server`, `./schema`, `./app-augment`, `./routes/*`, `./*`) so
  Vite/SvelteKit's Svelte plugin claims them and compiles the re-exported
  `.svelte` components. Without it, Node's plain ESM loader received raw
  `.svelte` files and threw `ERR_UNKNOWN_FILE_EXTENSION`.

## 2.1.0

### Minor Changes

- correct context.svelte export

## 2.0.12

### Patch Changes

- Fix ESM resolution for `schema-context.svelte` rune module (dist imports
  now emit `.svelte.js` extension).
- Confirm-dialog: use shadcn `<Button>` components and break long titles so
  long asset filenames no longer stretch the delete modal.
- DocumentEditor: vertically center the header top row (breadcrumb, auto-save,
  draft/published pills, ellipsis).
- DocumentEditor: autosave now compares against an initial-defaults snapshot,
  so unchecking a boolean triggers save and booleans with `initialValue: true`
  no longer auto-create the document on mount.

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/ui@0.3.3

## 2.0.10

### Patch Changes

- USE ZOD API. and couple of minor bug fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.2

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.1

## 2.0.8

### Patch Changes

- remove version restoration restriction

## 2.0.7

### Patch Changes

- hotfix. export document version panel

## 2.0.6

### Patch Changes

- added versioning

## 2.0.5

### Patch Changes

- cache key creation works on nested items

## 2.0.4

### Patch Changes

- add in memory caching

## 2.0.3

### Patch Changes

- Fix DocumentEditor overflow scroll bug and update apiKeyClient import for better-auth v1.5.x

## 2.0.2

### Patch Changes

- pluralize instead of just appending s

## 2.0.1

### Patch Changes

- template fixers

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.3.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.2.0
