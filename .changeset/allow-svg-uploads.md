---
'@aphexcms/cms-core': minor
---

Allow SVG uploads by default, with the serving path hardened to make that safe

Logos and icons are overwhelmingly SVG, and leaving `image/svg+xml` out of the
default allow-list made the media library useless for the most common brand asset
someone needs to upload. It is now in `DEFAULT_ALLOWED_MIME_TYPES`.

That is only safe because of how the asset route serves it. An SVG is not an image
format but a document — it can carry `<script>`, event handlers and
`<foreignObject>` — and it is served from the app's own origin, so a browser
navigated to one executes it against the admin session. `/media/{id}/{filename}`
already forced `Content-Disposition: attachment` for SVG; this adds a
`default-src 'none'; sandbox` CSP alongside it, and applies both to **every** branch
that echoes the asset's own MIME type. The ranged branch previously sent no
`Content-Disposition` at all, so the attachment rule never reached it.

The net effect: `<img src="...">` renders an uploaded SVG normally, because scripts
never run in an image context, while loading it as a document is refused.

Field-level `accept` is unchanged and still only ever **narrows** the
installation-wide list — so `accept: ['image/svg+xml']` now works where it silently
rejected everything before.
