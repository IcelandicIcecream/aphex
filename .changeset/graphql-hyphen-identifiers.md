---
'@aphexcms/cms-core': patch
---

Sanitize schema names with hyphens in GraphQL identifiers. A schema type named `blog-post` produced an invalid GraphQL identifier, since the spec only permits `[_A-Za-z][_0-9A-Za-z]*`. Type, field, union, and object names are now normalized through shared `toPascalCase` / `toCamelCase` helpers (`src/lib/utils/string-case.ts`), which handle hyphens, underscores, and camelCase boundaries consistently across the GraphQL schema builder, the resolvers, and `generate-types`.

Thanks [@ChristopherSO](https://github.com/ChristopherSO) — [#267](https://github.com/IcelandicIcecream/aphex/pull/267).
