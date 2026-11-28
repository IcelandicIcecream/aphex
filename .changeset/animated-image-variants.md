---
'@aphexcms/cms-core': minor
---

Animated GIFs and WebPs now get responsive sizes. Each size is an animated WebP with every frame resized, so a phone no longer downloads the full-size animation. An animation over 1,000 frames or 500 million pixels in total (frames × width × height) is still served as uploaded, as before. Without the animated flag, sharp counted every frame against the 100 million pixel limit, so an animation of any length couldn't have been resized.
