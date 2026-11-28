---
'@aphexcms/cms-core': patch
---

Switching tabs in the editor no longer shows one field's validation result on another. The fields were matched to their inputs by position, so after a tab switch each rule could run against a different field's value (a correct date reported as an invalid date, an empty name as "the wrong kind of value").
