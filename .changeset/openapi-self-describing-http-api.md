---
'@aphexcms/cms-core': minor
---

Describe the HTTP API from the instance itself: `GET /api/openapi.json` and a rendered
reference at `GET /api/docs`.

The endpoint list was documented; what to send to any of them was not. You could see
that `POST /api/documents` existed and still have no way to learn what belongs in
`draftData` short of reading `schemaTypes` and the validator. That is worse than an
undocumented API, because it reads as complete.

Both halves of the new document are generated rather than written, which is the only
way this stays true:

- **Endpoint shapes** come from the zod contracts in `api/schemas/` — the same objects
  the handlers validate with, converted by `z.toJSONSchema`. A parameter cannot drift
  from its description because there is only one of it.
- **Document shapes** come from this instance's `schemaTypes`. A shipped file could
  only ever call `draftData` an untyped object; the generated spec emits a real
  `PostData` / `PageData` component per collection, with `required` taken from the same
  `isFieldRequired` the validator runs, `additionalProperties: false` to match the
  structural check that rejects undeclared fields, and slugs typed as the bare strings
  Aphex actually stores. `POST /api/documents` becomes a discriminated union keyed on
  `type`; `PUT` uses `anyOf`, because an update carries no `type` and the collection is
  settled by the id in the path.

This is why it is served per request (~2ms) instead of checked in: half of it only
exists once your config is loaded.

`/api/openapi.json` is authenticated — it enumerates your whole content model. `/api/docs`
is a static shell that fetches the spec from the browser with your session, so the page
itself carries nothing. It loads Scalar from a CDN; set `openapi: { docsUi: false }` to
unmount it on an instance that shouldn't pull third-party scripts. The JSON endpoint is
unaffected either way.

A registry maps each mounted route to its contract, and it is the one hand-maintained
piece — so a test diffs it against Hono's own `app.routes` in both directions. Mount a
route without describing it, or describe one that no longer exists, and CI fails naming
the exact key. Without that, this would be one more artifact that can go quietly stale.

Two fixes fell out of building it:

- **`listAssetsResponse` had drifted.** None of the response contracts in `api/schemas/`
  were imported anywhere, so nothing held them to reality; the assets listing returns
  `indexing`, `limits` and `images`, none of which the schema mentioned. They are now
  declared, and the response contracts are wired into the spec so they have a consumer.
- **`z.date()` cannot be represented in JSON Schema**, and zod's default is to throw.
  Several contracts accept `z.union([z.string(), z.date()])` because an adapter may
  return either, which took the whole endpoint down over a field that serialises to a
  string anyway. Dates are now described as ISO date-time strings, and a contract that
  cannot be converted at all degrades to "unconstrained" instead of 500-ing the
  document.

Also documented, rather than changed: `where` on `POST /api/documents/query` is
`z.unknown()` in the contract because `LocalAPI.find()` parses it, so the spec now
carries the filter DSL explicitly — every operator, `and`/`or` nesting, and a worked
example — instead of an empty schema that invites a plausible-looking guess that matches
nothing. The existing behaviour is unchanged and worth knowing: an unrecognised operator
(`eq` for `equals`) is dropped rather than rejected, which returns every document of that
type instead of none, while a malformed clause returns zero results. Both answer with
`200`. `select` is accepted and currently ignored.
