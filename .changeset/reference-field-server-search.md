---
'@aphexcms/cms-core': patch
---

A reference field's picker searches on the server, with the same full-text search as the document list, so every document can be found by typing. It used to load the first 200 of each type and filter those in the browser, so documents past the 200th couldn't be picked. Search now matches the start of words in the fields a schema's `search` names (or its title, name, heading, label and slug), as the document list does.
