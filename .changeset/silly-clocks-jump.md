---
'@aphexcms/cms-core': minor
---

Add an opt-in `public` option to `find`/`findByID`/`get` that strips `_meta.organizationId`, `createdBy`, `updatedBy`, and `publishedHash` from returned documents before they leave the call.

AphexCMS is embedded, not headless — a `load()` function calling the Local API gets whole documents back and typically passes them straight through to the client for hydration. That leaks these internal fields into every public page's source for any visitor or crawler to read in view-source, something a headless CMS (Sanity's GROQ, Payload's GraphQL/REST `select`) can't do by construction, since the frontend has to name every field it wants.

Set `{ public: true }` on any read used to render a public-facing page:

```ts
const { docs } = await localAPI.collections.page.find(context, {
	perspective: 'published',
	public: true
});
```

`type`/`status`/`revision`/`publishedAt`/timestamps are kept — the admin UI's CAS revision guard and unpublished-changes diffing depend on them, and public pages sometimes display `publishedAt`/`status` themselves. Defaults to `false`, so every existing call site (REST routes, the admin UI, an app's own authenticated reads) is unaffected — this is purely opt-in, applied per-call after any document-cache read/write so the cached payload always stays the full, unfiltered one.

The starter template (`templates/base`) now sets `public: true` on its homepage's page listing, so new projects see the pattern from the start.
