---
'@aphexcms/cms-core': minor
---

Video posters and duration, extracted in the browser at upload.

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
