---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

`list_assets` returns 25 files at a time (50 at most), each as its id, name, type, size, alt text and URL rather than the whole stored row, with `total`, `hasMore` and `nextOffset`. `upload_asset` returns the file in the same short form. A database error while listing or counting files is reported instead of reading as an empty library.

`query_documents` returns 20 documents by default and 50 at most, stops at about 24,000 characters (a first document larger than that comes skimmed), and answers with `totalDocs`, `hasMore` and `nextOffset`.

`create_document`, `update_document` and `update_singleton` answer with the saved document skimmed instead of echoing it, and `publish_document` with its id, status and revision. `get_document` and `get_singleton` skim a document over about 40,000 characters unless part of it is asked for. `describe_cms` lists object types by name and references as one line each.
