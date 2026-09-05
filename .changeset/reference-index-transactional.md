---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

Both reference indexes are now written inside the document's own write transaction, and the
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
