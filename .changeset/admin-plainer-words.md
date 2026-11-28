---
'@aphexcms/cms-core': minor
---

Plainer words in the admin, for people who aren't developers:

- A list counts its own kind ("2 pages", not "2 documents") and dates its rows "21 Nov", in the reader's language.
- A type whose `access.create` the signed-in person doesn't pass (a role list, or a policy asked with what the admin knows of them) shows no + button and no "Add your first… with the + button". `emptyText` on a document type says what an empty list should say instead ("When someone sends your contact form, it shows up here.").
- An array's add button names what it adds ("Add block" for Blocks, "Add dish" for a list of one type), not "Add item…".
- A slug's button reads "From title" and the hints that repeated it are gone.
- `openPreview` in the client config opens each document with a `previewUrl` beside its live preview on a wide screen; closing it keeps it closed for the visit.
