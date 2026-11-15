---
'@aphexcms/cms-core': patch
---

Font uploads (woff, woff2, otf, ttf, ttc) work. The upload route recognizes files by their contents and stored anything it didn't recognize as `application/octet-stream`. It had no font signatures, so every font was refused with `File type "application/octet-stream" is not allowed`, even though the default allow-list names the font types. Fonts are now recognized from their header tags.
