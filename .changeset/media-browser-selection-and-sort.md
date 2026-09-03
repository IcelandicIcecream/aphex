---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Media browser: range selection, a reachable Save button, and asset sorting that spans pages.

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
