---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Filter assets by media kind, and search their metadata — both in SQL.

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
