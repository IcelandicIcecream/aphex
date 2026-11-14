---
'@aphexcms/cms-core': minor
---

Limit how many documents an organization may create, such as a plan's "5 invoices a month", with `documentLimits` in `aphex.config.ts`; and rename the studio's "Content" and "Structure" with `labels` in `aphex.client.ts`.

- `documentLimits: ({ organizationId, type }) => ({ max, since?, message? }) | null` is checked on every create: the studio, the Local API, REST, GraphQL and MCP. At the limit, the create throws `DocumentLimitError`, REST answers 402 with `code: 'limit_reached'`, and the studio shows the message. With `since`, only documents created from then count.
- System writes (`overrideAccess`) and singletons aren't limited.
- `labels: { content?, structure? }` renames the document types list (its heading, breadcrumb and page title) and the tab that opens it.
- `tabs: { media?: false, vision?: false }` in `aphex.client.ts` turns off the Media and Vision tabs; with only the document list left, the tab bar hides.
- `liveEdit: true` on a schema makes it a record with no drafts: every save is published too, so documents referencing it can always be published. A save that wouldn't pass publish validation, or by a role that can't publish, stays a draft.
