---
'@aphexcms/cms-core': patch
---

Media grid reads as a library rather than a contact sheet, and upload rows are identifiable.

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
