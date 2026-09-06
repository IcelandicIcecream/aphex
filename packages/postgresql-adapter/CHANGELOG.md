# @aphexcms/postgresql-adapter

## 15.1.0

### Minor Changes

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

- Updated dependencies [[`e1a5693`](https://github.com/IcelandicIcecream/aphex/commit/e1a56936ef339cf050935986e082d1f71db1621a), [`f9df2ff`](https://github.com/IcelandicIcecream/aphex/commit/f9df2ffb33c6cc8969fbe3e479e7a7e082114215), [`03a1ab0`](https://github.com/IcelandicIcecream/aphex/commit/03a1ab04e68665fda2f98b8b75069e392f51f11f), [`6343a71`](https://github.com/IcelandicIcecream/aphex/commit/6343a71e7985b4b9cb8629045adc141b466272bb), [`debafeb`](https://github.com/IcelandicIcecream/aphex/commit/debafeb8657ff31815ce11d065a1edcf98fec801), [`7b8e85c`](https://github.com/IcelandicIcecream/aphex/commit/7b8e85c9742b9755c9beadcd889dc8657cbf920e), [`5d72187`](https://github.com/IcelandicIcecream/aphex/commit/5d72187348af378c7867fd23220856dc6001eaea)]:
  - @aphexcms/cms-core@10.1.0

## 15.0.0

### Major Changes

- [#303](https://github.com/IcelandicIcecream/aphex/pull/303) [`8bc885b`](https://github.com/IcelandicIcecream/aphex/commit/8bc885b88bbe2617a27c777cafb19c72a30dde9c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Asset reference cleanup, typed asset metadata, and revision compare-and-swap.

  ## Breaking
  - **`clearAssetFromPublishedData` is renamed `clearAssetReferences`.** It now also clears the ref
    out of `draftData`, which nothing previously did — so deleting an asset left a dangling `_ref` in
    every draft that used it. The `publishedData` behaviour is unchanged and still skips published
    rows deliberately: that column is written only by publish, and rewriting it from a delete would
    break both that invariant and the content hash.

  ## Fixed
  - **The org-hierarchy wrapper now forwards `expectedRevision`.** Both adapters wrap the document
    adapter to retry a not-found read against a child org, and that wrapper dropped the field — so
    compare-and-swap was silently a no-op end to end even though the inner adapter enforced it
    correctly. Now covered by a cross-dialect conformance block run against both pglite and libsql.

  ## Changed
  - `cms_assets.metadata` is typed as `AssetMetadata` on the column rather than asserted at each
    read. Type-only — **no migration**, the column is still `jsonb` / JSON text.

### Minor Changes

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

### Patch Changes

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

- Updated dependencies [[`876cd15`](https://github.com/IcelandicIcecream/aphex/commit/876cd15b4b96fa296c5b2441bf68a348a0428771), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`8bc885b`](https://github.com/IcelandicIcecream/aphex/commit/8bc885b88bbe2617a27c777cafb19c72a30dde9c), [`484213d`](https://github.com/IcelandicIcecream/aphex/commit/484213d5af49f4dcde21c6a6ddf4d1002ac3a81f), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5), [`fccb16b`](https://github.com/IcelandicIcecream/aphex/commit/fccb16b39218162980a3ca6f04e6e43bfeb7bf20), [`6f22b2b`](https://github.com/IcelandicIcecream/aphex/commit/6f22b2b1b15fcf401795d399b6a91c35557654c5)]:
  - @aphexcms/cms-core@10.0.0

## 14.5.0

### Minor Changes

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

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Give every paginated list a deterministic tiebreaker.

  Eight queries across both dialects ordered by `created_at`/`updated_at` alone — change-sets,
  events, jobs, plugin storage, and assets. Those columns have millisecond resolution, so rows
  written in the same millisecond tie, and an untied sort lets the database return them in either
  order per query. Across two offset pages that can show one row twice and skip another entirely.

  All eight now break the tie on `id`, matching what `listDocuments` already did. The ids are
  random v4, so this buys _stability_, not sub-millisecond ordering — nothing here claims to order
  two rows written in the same millisecond, and the fix is that the same page boundary now falls in
  the same place every time.

  Covered by a conformance case that inserts rows with identical timestamps and pages through them.

- Updated dependencies [[`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903), [`cda2dfd`](https://github.com/IcelandicIcecream/aphex/commit/cda2dfd2f8113d3d423e5acda985410246293353), [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903)]:
  - @aphexcms/cms-core@9.9.0

## 14.4.0

### Minor Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an audit/undo trail for the in-admin AI assistant's writes — `cms_agent_change_sets` (one row per agent turn, capturing `provider`/`model`/`promptTokens`/`completionTokens` for cost/usage auditing regardless of whether the turn mutated anything) and `cms_agent_operations` (one row per mutating tool call, with the document-version numbers an undo restores between).
  - New `AgentChangeSetAdapter` port (`createChangeSet`/`recordOperation`/`completeChangeSet`/`getChangeSet`/`listChangeSets`), implemented in both relational adapters, mirroring the `EventJobAdapter`/`cms_domain_events` schema pattern (org-scoped, RLS on Postgres, WHERE-scoped on SQLite) — proven identical across dialects by the cross-dialect conformance suite.
  - `POST /api/agent/chat` now eagerly creates a change-set per turn and records every mutating tool call against it, best-effort (a recording failure never breaks the chat itself).
  - New `POST /api/agent/change-sets/:id/undo` reuses the existing CAS-guarded `VersionService.restoreVersion` — the same primitive the document editor's own version-restore already calls — so undo is not new revert logic, just "restore to the version before this operation," applied in reverse order. Known limitation: `create_document` operations aren't undoable (no delete primitive wired in), and undo never auto-unpublishes.
  - `ActivityView.svelte` gains an "Agent Changes" tab: change-set list with provider/model/token counts, expandable per-turn operation detail, and an Undo button.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add compare-and-swap (CAS) concurrency control for document writes — Milestone 1 of the content-copilot plan (`references/content-copilot-phase-1-plan.md`), and useful on its own: two browser tabs open on the same document no longer silently clobber each other.
  - `cms_documents` gains a monotonic `revision` column, incremented on every draft write.
  - `updateDocDraft`/`publishDoc`/`unpublishDoc` (both adapters) and `VersionService.restoreVersion` accept an optional `expectedRevision`; a mismatch throws `RevisionConflictError` (`documentId`/`expectedRevision`/`currentRevision`) instead of overwriting. Omitting `expectedRevision` preserves the previous unconditional last-write-wins behavior — fully backward compatible.
  - Threaded through `CollectionAPI.update`/`publish`/`unpublish`, the zod request/response schemas (`expectedRevision` in, `revision` out via `_meta`), and the HTTP routes (`RevisionConflictError` → 409 with `currentRevision`).
  - `DocumentEditor.svelte` sends the revision it last read on autosave, publish, unpublish, and version-restore, and surfaces a 409 distinctly ("this document was changed elsewhere, reload") instead of a generic save error or a silent overwrite.
  - Fixed a gap the cross-dialect conformance suite caught: `PostgreSQLAdapter`/`SQLiteAdapter`'s org-hierarchy wrapper (the class `apps/studio` actually talks to) wasn't forwarding `expectedRevision` to the underlying document adapter, so CAS would have been a no-op end-to-end despite being correctly implemented one layer down. Fixed by threading the parameter through a shared `withHierarchyFallback` helper (also de-duplicating four near-identical hierarchy-retry blocks per adapter).
  - New cross-dialect conformance coverage (`packages/sqlite-adapter/tests/conformance.spec.ts`, run against both pglite and libsql): revision incrementing, the two-tabs stale-write rejection, publish/unpublish CAS, and unconditional-write-still-works-when-omitted.

### Patch Changes

- Updated dependencies [[`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765), [`58d92a8`](https://github.com/IcelandicIcecream/aphex/commit/58d92a854d6bde5204d1415cf25f301d85ae1983), [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765), [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765), [`1771663`](https://github.com/IcelandicIcecream/aphex/commit/1771663f2197648e9b20b75871bf87de6d9dae3a), [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb), [`657db9e`](https://github.com/IcelandicIcecream/aphex/commit/657db9e3ec1f2251bc98fd2e132616a050545d6e), [`64706f9`](https://github.com/IcelandicIcecream/aphex/commit/64706f9d334085e61e51d7ca0a42664f448a51bc), [`0108350`](https://github.com/IcelandicIcecream/aphex/commit/0108350f2eee7d89651fc4e89a8140ba49c1b646), [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb)]:
  - @aphexcms/cms-core@9.8.0

## 14.3.0

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

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a generic plugin storage primitive — `cms_plugin_storage`, the data-plane
  sibling of `cms_plugin_settings`. Plugins persist arbitrary org-scoped JSON
  records namespaced by `(plugin, collection)` through the new
  `PluginStorageAdapter` port (`createPluginRecord` / `getPluginRecord` /
  `listPluginRecords`), implemented by both the PostgreSQL and SQLite adapters.
  `createPluginRecord` is callable on the `withTransaction` handle, so a record
  and the domain event announcing it commit atomically (transactional outbox).

### Patch Changes

- Updated dependencies [[`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3), [`20b10c5`](https://github.com/IcelandicIcecream/aphex/commit/20b10c53987605fd8e3cb77156eb6b2753fed6d0), [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3), [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3), [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3), [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3)]:
  - @aphexcms/cms-core@9.7.0

## 14.2.0

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

- Updated dependencies [[`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/cms-core@9.5.0

## 14.1.1

### Patch Changes

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix JSONB `in`/`not_in` filters: drizzle expands an embedded array into a tuple, so the previous `= ANY((a, b))` was invalid Postgres (error 42809) — now emits a plain `IN (...)` list with correct empty-array semantics. Also normalize the raw-SQL result shape in `findAssetByIdGlobal` so it works on drivers that return `{ rows }` (pglite) as well as postgres-js. Both found by the new cross-dialect conformance suite.

- Updated dependencies [[`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf), [`53f3209`](https://github.com/IcelandicIcecream/aphex/commit/53f32098b7f837263ef92a61208511569ad39654), [`21dc2dc`](https://github.com/IcelandicIcecream/aphex/commit/21dc2dcd2c706870615de4017476562a8f40ffef)]:
  - @aphexcms/cms-core@9.4.0

## 14.1.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add PGlite corruption guards. New `createPgliteClient(dataDir?)` export returns an HMR-safe singleton (one instance per data dir per process, cached on `globalThis`) and registers a graceful-shutdown hook (`beforeExit`/`SIGINT`/`SIGTERM`) that closes PGlite cleanly. This prevents the double-open and mid-write corruption that PGlite (which lacks Postgres's WAL crash recovery) is prone to during dev HMR and process exits. `createPgliteProvider` uses the guarded client automatically when no `client` is supplied.

### Patch Changes

- Updated dependencies [[`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7)]:
  - @aphexcms/cms-core@9.3.0

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

### Minor Changes

- better reference fields !

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

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

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

- hmr fixes and ui fixes

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

- added versioning

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
