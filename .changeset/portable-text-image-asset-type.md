---
'@aphexcms/cms-core': patch
---

Type generation: give Portable Text image blocks the full asset shape

`PortableTextImageBlock.asset` was generated as `{ _ref, _type }`, so reading
`image.asset.srcset` (or `url`, `width`, `height`) inside rich text was a type
error — even though asset injection writes exactly those fields at render time,
and the identical read on a document-level image field compiled fine.

It now reuses `ImageValue['asset']`, which is the same value at runtime. The
equivalent fix had already been made for `ImageValue` itself; this was the half
that was missed, and it forced a cast on anyone rendering an inline image.
