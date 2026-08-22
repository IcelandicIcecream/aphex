---
'@aphexcms/cms-core': minor
---

Add search to the admin document list. A magnifying-glass icon in the list toolbar reveals a search box that filters documents server-side (debounced, 300ms) via a new `search` query param on `GET /documents`.

By default it matches against the schema's configured preview title field plus the conventional `title`/`heading`/`name`/`label`/`slug` fields — the same fields `resolvePreviewTitle` already uses to pick a display title. A schema can opt into explicit control with a new `search?: SearchFieldConfig[]` property (a list of `{ path }` dot-paths), or generate it from every top-level string-ish field with the new `searchableFields(schema)` helper (`@aphexcms/cms-core/schema`):

```ts
const fields = [
	/* ... */
];
export default defineType({
	name: 'post',
	fields,
	search: searchableFields({ fields })
});
```

Uses the existing `contains` filter operator (case-insensitive `ILIKE`), so no adapter changes were needed.
