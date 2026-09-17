---
'@aphexcms/cms-core': patch
---

Validate array items of named types (`of: [{ type: 'cta' }]`) against their registered schema. Those entries carry no `fields` of their own, so every field inside a page-builder block went unchecked on save and publish. `validateDocumentData` now takes `schemas` in its context (threaded from the Local API and the MCP `validate_document` tool); keys from fields a registered block has since dropped are tolerated so existing pages still publish. An object array item with no `_type` is now a structural error instead of being guessed as the single declared type, which stored rows the studio then showed as "Unknown item".
