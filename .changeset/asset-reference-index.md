---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Index which documents use which assets, and filter the media library by usage.

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
