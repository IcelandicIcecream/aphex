---
'@aphexcms/cms-core': patch
---

`aphex generate:types` now types blocks declared in place in an array (`of: [{ type: 'hero', fields: [...] }]`). They used to be dropped, so a page builder's whole array came out as `unknown[]`. Every object array item now gets its stored `_type` as a literal (`_type: 'hero'`, `_type: 'linkItem'`), so `if (block._type === 'hero')` narrows a block union. A document whose only references sit inside such blocks now gets its `*Resolved` variant.

The OpenAPI write shapes had the same gap: those blocks accepted anything, and every object array item forbade the `_type` that validation requires on it. Each item now declares `_type` (required, as a const) and `_key`, and objects allow the `_`-prefixed keys the validator already skips.

Upgrading: run `aphex generate:types` again. Code that builds an array item without `_type` now fails to compile; it already failed validation at runtime.
