---
'@aphexcms/cms-core': patch
---

A custom validation rule now receives `context.parent`: the object the field sits in (an array item, a nested object, or the document at the top level), as the type always declared. A rule can depend on its siblings, such as "an account number or an IBAN".
