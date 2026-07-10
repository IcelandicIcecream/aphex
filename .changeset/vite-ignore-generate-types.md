---
'@aphexcms/cms-core': patch
---

Silence a Vite SSR warning from `generate-types`. The CLI dynamically imports the consumer's schema module by a path resolved at runtime, which Vite cannot statically analyze — the import is now marked `/* @vite-ignore */`, so pulling this file into a dev bundle no longer logs "The above dynamic import cannot be analyzed by Vite."
