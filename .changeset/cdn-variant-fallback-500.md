---
'@aphexcms/cms-core': patch
---

Fix the asset CDN returning a 500 instead of the original when a variant can't be served. Variant headers were set through SvelteKit's `setHeaders` before the generate-or-fall-back branch, so every fall-through to the original (an animated GIF, a failed generation) tried to set `Content-Type` twice and threw. Headers now go on the variant `Response` itself.
