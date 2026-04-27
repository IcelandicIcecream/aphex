# Hono API Migration — Execution Plan

Companion to `HONO_API_PROPOSAL.md`. Read that first. This document is the
step-by-step execution plan, grounded in the actual files in this repo as of
branch `feature/better-endpoints`.

---

## 1. Verified current state (no assumptions)

### 1.1 Existing route handlers in cms-core (22 files)

Located at `packages/cms-core/src/lib/routes/`:

```
assets-bulk.ts                  organizations-by-id.ts
assets-by-id.ts                 organizations-invitations.ts
assets-cdn.ts                   organizations-members.ts
assets-references-counts.ts     organizations-switch.ts
assets-references.ts            organizations.ts
assets.ts                       roles-by-name.ts
document-versions.ts            roles.ts
documents-by-id.ts              schemas-by-type.ts
documents-publish.ts            schemas.ts
documents-query.ts              user-preferences.ts
documents.ts                    index.ts            (barrel; no handler)
```

These are SvelteKit `RequestHandler` exports (`GET`, `POST`, `PUT`, etc.) that
read `locals.aphexCMS` and `locals.auth`.

### 1.2 Existing `+server.ts` shims in studio (31 files)

Output of `find apps/studio/src/routes/api -name "+server.ts"`:

```
api/assets/+server.ts                                       (re-export)
api/assets/[id]/+server.ts                                  (re-export)
api/assets/[id]/references/+server.ts                       (re-export)
api/assets/bulk/+server.ts                                  (re-export)
api/assets/references/counts/+server.ts                     (re-export)
api/documents/+server.ts                                    (re-export)
api/documents/[id]/+server.ts                               (re-export)
api/documents/[id]/publish/+server.ts                       (re-export)
api/documents/[id]/versions/+server.ts                      (re-export)
api/documents/[id]/versions/[version]/+server.ts            (re-export)
api/documents/[id]/versions/[version]/restore/+server.ts    (re-export)
api/documents/query/+server.ts                              (re-export)
api/instance-settings/+server.ts                            (NOT in cms-core — studio-local)
api/invitations/+server.ts                                  (NOT in cms-core — studio-local)
api/invitations/[id]/accept/+server.ts                      (NOT in cms-core — studio-local)
api/invitations/[id]/reject/+server.ts                      (NOT in cms-core — studio-local)
api/organizations/+server.ts                                (re-export)
api/organizations/[id]/+server.ts                           (re-export)
api/organizations/invitations/+server.ts                    (re-export)
api/organizations/members/+server.ts                        (re-export)
api/organizations/switch/+server.ts                         (re-export)
api/roles/+server.ts                                        (re-export)
api/roles/[name]/+server.ts                                 (re-export)
api/schemas/+server.ts                                      (re-export)
api/schemas/[type]/+server.ts                               (re-export)
api/seed-movies/+server.ts                                  (studio-only seed route — keep)
api/send-email/+server.ts                                   (studio-local — verify)
api/settings/api-keys/+server.ts                            (studio-local — verify)
api/settings/api-keys/[id]/+server.ts                       (studio-local — verify)
api/user/+server.ts                                         (re-export)
api/user/cms-preference/+server.ts                          (studio-local — verify)
api/user/request-password-reset/+server.ts                  (studio-local — verify)
api/user/reset-password/+server.ts                          (studio-local — verify)
```

> The proposal said "~20" — actual count is 31. **Several routes have no
> equivalent in `cms-core/src/lib/routes/` and are studio-local.** They must
> be inventoried before migration: either ported into cms-core or kept as
> studio-only routes registered onto the Hono app in `aphex.config.ts`.

### 1.3 Existing zod schemas

`packages/cms-core/src/lib/api/schemas/`:

```
api-keys.ts  assets.ts  documents.ts  organizations.ts  roles.ts  user.ts
schemas/   (subdirectory)
```

Already structured for `zValidator` consumption. Reused as-is.

### 1.4 `routes-exports.ts` shape

`packages/cms-core/src/lib/routes-exports.ts` — 55 lines, re-exports
`GET as getDocuments`, `POST as createDocument`, etc. This file is consumed
by `apps/studio/src/routes/api/**/+server.ts` shims **and** re-exported from
`packages/cms-core/src/lib/server/index.ts:40`.

### 1.5 Plugin route mechanism (already exists)

`packages/cms-core/src/lib/types/config.ts:12-18`:

```ts
export interface CMSPlugin {
  name: string;
  version: string;
  routes?: { [path: string]: (event: any) => Promise<Response> | Response };
  install: (cms: any) => Promise<void>;
  config?: { [key: string]: any };
}
```

`packages/cms-core/src/lib/hooks.ts:185-189, 290-300` — plugins register
exact-path routes into a `Map<string, handler>`, intercepted in the SvelteKit
hook before `resolve()`. Used today by the built-in GraphQL plugin
(`hooks.ts:218-251`).

> **Important:** plugin routes today are **exact path matches**, not
> Hono-style routers. They cannot register parameterised paths like
> `/api/foo/:id`. The proposal's plugin story is a strict superset.

### 1.6 Test infrastructure

- Vitest, configured in `apps/studio/vitest.config.ts`.
- HTTP tests at `apps/studio/tests/comprehensive-http-api.test.ts`
  use a hand-rolled `makeRequest()` helper (`lines 85-142`) that
  **imports `+server.ts` files directly** and synthesises a SvelteKit-shaped
  `event` object. This helper **must be rewritten** post-migration — see §6.
- Existing test commands: `test:local`, `test:http`, `test:graphql`,
  `test:all` (per `apps/studio/package.json:24-30`).

### 1.7 Templates

Both `templates/base/src/routes/api/**` and
`packages/create-aphex/templates/base/src/routes/api/**` are kept in sync via
`./scripts/sync-template.sh` (per `CLAUDE.md` "Syncing studio → template →
CLI"). Migration must update studio first; template sync follows.

---

## 2. Target architecture

### 2.1 New file: `packages/cms-core/src/lib/server/api/index.ts`

```ts
import { Hono } from 'hono';
import type { CMSInstances } from '../../hooks';
import type { AphexAuth } from '../../auth/...';
import { documentsRouter } from './routes/documents';
import { documentsByIdRouter } from './routes/documents-by-id';
// ... one import per route file

export type AphexEnv = {
  Variables: {
    aphexCMS: CMSInstances;
    auth: AphexAuth | null;
  };
};

export function createAphexApi() {
  const app = new Hono<AphexEnv>().basePath('/api');
  app.route('/documents', documentsRouter);
  app.route('/documents', documentsByIdRouter); // /:id mounted under same prefix
  // ...
  return app;
}

export type ApiRoutes = ReturnType<typeof createAphexApi>;
```

The app is **created per-request inside the SvelteKit hook**, OR cached as a
singleton if plugin routes are installed once at boot. We will go with
**boot-time creation** — built once after plugin install completes
(`hooks.ts` after line 251), stored on `CMSInstances`.

### 2.2 New router file shape (`packages/cms-core/src/lib/server/api/routes/documents.ts`)

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { listDocumentsQuery, createDocumentRequest } from '../../../api/schemas/documents';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

export const documentsRouter = new Hono<AphexEnv>()
  .get('/', zValidator('query', listDocumentsQuery), async (c) => {
    const { localAPI } = c.var.aphexCMS;
    const context = authToContext(c.var.auth);
    const q = c.req.valid('query');
    // ... ported body
    return c.json({ success: true, data, pagination });
  })
  .post('/', zValidator('json', createDocumentRequest), async (c) => {
    // ...
  });
```

### 2.3 Catch-all: `apps/studio/src/routes/api/[...slug]/+server.ts`

```ts
import type { RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = ({ request, locals, getClientAddress }) => {
  const app = locals.aphexCMS.apiApp; // Hono app, built at boot
  request.headers.set('x-forwarded-for', getClientAddress());
  return app.fetch(request, {
    aphexCMS: locals.aphexCMS,
    auth: locals.auth
  });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
```

> The `app.fetch(request, env)` second arg becomes `c.env`; we map it to
> `c.var` via `app.use(async (c, next) => { c.set('aphexCMS', c.env.aphexCMS); ... })`.
> This is how we pass SvelteKit `locals` into Hono context without parsing
> requests twice.

### 2.4 Hook integration (`packages/cms-core/src/lib/hooks.ts`)

Add to `CMSInstances`:

```ts
apiApp: Hono<AphexEnv>;
```

Build the Hono app once during hook init, then register GraphQL (if
enabled) and any user `config.api` routes onto it:

```ts
const apiApp = createAphexApi();

// Built-in GraphQL — registered directly on apiApp (no plugin layer).
if (config.graphql !== false) {
  const { createGraphQLHandler } = await import('./graphql/index');
  const result = await createGraphQLHandler(...);
  apiApp.all('/graphql', toHonoHandler(result.handler));
  apiApp.get('/graphql/playground', toHonoHandler(playgroundHandler));
}

// User-defined custom endpoints from aphex.config.ts:
config.api?.(apiApp);
```

### 2.5 User-config API (plugin scaffolding stripped)

Add to `CMSConfig`:

```ts
api?: (app: Hono<AphexEnv>) => void;
```

**The entire `CMSPlugin` / `CMSPluginConfig` / `CMSPluginReference`
scaffolding is deleted** (per user confirmation — zero callers in the
codebase, no `plugins:` entry in any `aphex.config.ts`, no
`defineAphexPlugin()` usage). `resolvePlugin()`, the `plugins?:` field on
`CMSConfig`, and the `pluginRoutes` Map in `hooks.ts` all go.

The built-in GraphQL handler — currently the **only** thing populating
`pluginRoutes` (`hooks.ts:240-246`) — moves to direct registration on
`apiApp` in `hooks.ts` itself, not through any plugin abstraction:

```ts
if (config.graphql !== false) {
  const result = await createGraphQLHandler(...);
  apiApp.all('/graphql', toHonoHandler(result.handler));
  apiApp.get('/graphql/playground', toHonoHandler(playgroundHandler));
}
```

When a real plugin ships in the future, design the plugin API around the
shape that plugin actually needs. Don't pre-build it on speculation.

---

## 3. Phased migration (each phase ships independently)

### Phase 0 — Spike & verification (no merges)

- [ ] Add `hono` and `@hono/zod-validator` to `packages/cms-core/package.json`
      `dependencies`. Run `pnpm install` from repo root. Verify TS resolves.
- [ ] Create `packages/cms-core/src/lib/server/api/index.ts` exporting an
      empty `createAphexApi()`.
- [ ] Add `apiApp` field to `CMSInstances`; build at end of hook init.
- [ ] Create `apps/studio/src/routes/api/[...slug]/+server.ts` catch-all
      that calls `locals.aphexCMS.apiApp.fetch(...)`.
- [ ] Verify: with the catch-all in place but **no Hono routes registered**,
      existing `+server.ts` files still win (SvelteKit prefers specific over
      catch-all). Run `pnpm dev:studio`, hit `/api/documents` — should still
      work. Run `pnpm -F @aphexcms/studio test:http` — should pass.

### Phase 1 — Port `schemas` (proof of concept, no params)

- [ ] Port `routes/schemas.ts` and `routes/schemas-by-type.ts` to
      `lib/server/api/routes/schemas.ts`.
- [ ] Mount in `createAphexApi()`.
- [ ] **Delete** `apps/studio/src/routes/api/schemas/+server.ts` and
      `apps/studio/src/routes/api/schemas/[type]/+server.ts`.
- [ ] Run dev, hit `/api/schemas` and `/api/schemas/page`. Run HTTP tests.
- [ ] If green, commit. **Do not delete the cms-core source file yet** —
      keep `routes/schemas.ts` until §4.

### Phase 2 — Port `documents` family

Order: `documents.ts` → `documents-by-id.ts` → `documents-publish.ts` →
`documents-query.ts` → `document-versions.ts`.

For each: port, mount, delete corresponding `+server.ts` shim(s), test.

> Param paths: in `documents-by-id.ts`, Hono uses `:id` not `[id]`. The
> wire-format URL is unchanged.

### Phase 3 — Port `assets` family

`assets.ts`, `assets-by-id.ts`, `assets-cdn.ts`, `assets-bulk.ts`,
`assets-references.ts`, `assets-references-counts.ts`. Same procedure.

> `assets-cdn.ts` serves binary content — verify `c.body()` /
> `c.newResponse()` for streaming responses behaves identically. Compare
> response headers byte-for-byte against pre-migration.

### Phase 4 — Port `organizations`, `roles`, `user-preferences`

Mechanical at this point. Same procedure.

### Phase 5 — Studio-local routes (NOT in cms-core)

**Decision (user-confirmed):** these routes register from
`apps/studio/aphex.config.ts` via the new `config.api: (app) => {...}` hook.
They do **not** move into cms-core. The catch-all forwards them; their
`+server.ts` shims get deleted.

This keeps cms-core focused on the universal CMS surface and gives any
end-user app the same extension point — anything you'd put in a `+server.ts`
today, you put in `config.api` tomorrow.

Routes to register from `aphex.config.ts`:

- `api/instance-settings/`
- `api/invitations/` and `[id]/accept`, `[id]/reject`
- `api/send-email/`
- `api/settings/api-keys/` and `[id]/`
- `api/user/cms-preference/`, `request-password-reset/`, `reset-password/`

Studio-only dev convenience:

- `api/seed-movies/` — leave as a `+server.ts` since the catch-all-vs-specific
  precedence rule means it still works, and it has no place in the public
  config surface.

**Implementation pattern** — extract each handler body into a function that
takes a Hono context, then in `aphex.config.ts`:

```ts
import { defineConfig } from '@aphexcms/cms-core/server';
import { sendEmailHandler } from './src/lib/server/api/send-email';
import { invitationsHandlers } from './src/lib/server/api/invitations';

export default defineConfig({
  // ...existing config...
  api: (app) => {
    app.post('/send-email', sendEmailHandler);
    app.get('/invitations', invitationsHandlers.list);
    app.post('/invitations/:id/accept', invitationsHandlers.accept);
    app.post('/invitations/:id/reject', invitationsHandlers.reject);
    // ...etc
  }
});
```

The handler files live under `apps/studio/src/lib/server/api/` —
**outside** the SvelteKit `routes/` tree so SvelteKit doesn't try to route
them. This is the canonical "extend Aphex with custom endpoints" pattern
that ships in docs.

### Phase 6 — Strip plugin scaffolding & migrate GraphQL

The entire plugin layer is dead code (zero `plugins:` entries in any
`aphex.config.ts`, zero `defineAphexPlugin()` calls). Strip it.

- [ ] Migrate the built-in GraphQL handler from `hooks.ts:218-251` to
      register directly on `apiApp`:
      - `apiApp.all('/graphql', toHonoHandler(graphqlHandler))`
      - `apiApp.get('/graphql/playground', toHonoHandler(playgroundHandler))`
      - Write a small `toHonoHandler(skHandler)` adapter in
        `lib/server/api/index.ts` that wraps a SvelteKit `RequestHandler`
        and returns a Hono handler — the GraphQL handler stays a SvelteKit
        handler internally for now (no need to rewrite it).
- [ ] **Delete** from `packages/cms-core/src/lib/types/config.ts`:
      - `CMSPlugin` interface
      - `CMSPluginReference` interface
      - `CMSPluginConfig` type
      - `plugins?: CMSPluginConfig[]` field on `CMSConfig`
- [ ] **Delete** from `packages/cms-core/src/lib/hooks.ts`:
      - `resolvePlugin()` function
      - `pluginRoutes` field on `CMSInstances`
      - The `pluginRoutes` Map construction (`hooks.ts:170+`)
      - The plugin resolution loop (`hooks.ts:179-208`)
      - The `pluginRoutes.get(event.url.pathname)` intercept
        (`hooks.ts:290-300`)
- [ ] Grep `apps/`, `templates/`, `packages/` for `CMSPlugin`, `plugins:`,
      `defineAphexPlugin` — verify no surviving references except in the
      to-be-deleted code itself.
- [ ] Note in changelog: "Plugin scaffolding removed; was unused. Will be
      reintroduced when first real plugin ships, designed around its
      actual needs."

### Phase 7 — Cleanup & templates

- [ ] **Delete** `packages/cms-core/src/lib/routes-exports.ts` (per Q2,
      no deprecation). Grep `apps/`, `packages/`, `templates/` first to
      confirm zero usage outside studio shims and `lib/server/index.ts:40`.
      Remove the re-export from `lib/server/index.ts`.
- [ ] **Delete** `packages/cms-core/src/lib/routes/index.ts` and the
      per-route handler files now that they're ported. Same commit.
- [ ] Run `./scripts/sync-template.sh --apply` to flow studio changes into
      `templates/base/`.
- [ ] Manually delete equivalent `+server.ts` files in `templates/base/` —
      the sync script copies; it does not delete files removed from studio.
      **This is a known gap of the template-driven sync model
      (per `CLAUDE.md` step 2).**
- [ ] Update `templates/base/CHANGELOG.md` Unreleased section.
- [ ] Rebuild `create-aphex`: `pnpm -F create-aphex build`.

### Phase 8 — Docs

- [ ] Document `api: (app) => void` in `aphex.config.ts` reference.
- [ ] Document plugin `api?: (app) => void` in plugin authoring guide.
- [ ] Add a "type-safe RPC client" section if we ship `hono/client`
      consumption (proposal §Wins — meaningful DX win).

### Phase 9 — Settings PageComponents (UI extensibility refactor)

**Goal:** the studio's settings pages become **thin wrappers** that import
PageComponents from `@aphexcms/cms-core/client`. End users get free UI
upgrades (bump cms-core, get fixes/new features) but can still extend, wrap,
or replace any page locally.

This phase is independent of Phases 0-8 — it can ship before, after, or in
parallel — but it belongs in the same plan because it shares the same goal:
**push more into the upgradeable core, leave thin extension points in the
app shell**. The HTTP migration does it for routes; this does it for pages.

#### 9.1 Verified current state

`apps/studio/src/routes/(protected)/admin/settings/`:

```
+page.svelte                         32 lines  — already thin (uses _components/OrganizationsSettings)
account/+page.svelte                 23 lines  — already thin (uses _components/AccountSettings)
api-keys/+page.svelte                14 lines  — already thin (uses _components/ApiKeysSettings)
members/+page.svelte                338 lines  — INLINE: needs extraction
roles/+page.svelte                  339 lines  — INLINE: needs extraction
_components/OrganizationsSettings.svelte
```

So two pages already follow the wrapper pattern with **studio-local**
`_components/`; two pages need extraction. The work is (a) move all five
components into cms-core, (b) extract the inline ones.

#### 9.2 Target shape

`packages/cms-core/src/lib/components/admin/settings/`:

```
OrganizationSettingsPage.svelte
AccountSettingsPage.svelte
ApiKeysSettingsPage.svelte
MembersSettingsPage.svelte         (extracted from members/+page.svelte)
RolesSettingsPage.svelte           (extracted from roles/+page.svelte)
```

Exported from `packages/cms-core/src/lib/client/index.ts`:

```ts
export { default as OrganizationSettingsPage } from '../components/admin/settings/OrganizationSettingsPage.svelte';
export { default as AccountSettingsPage } from '../components/admin/settings/AccountSettingsPage.svelte';
export { default as ApiKeysSettingsPage } from '../components/admin/settings/ApiKeysSettingsPage.svelte';
export { default as MembersSettingsPage } from '../components/admin/settings/MembersSettingsPage.svelte';
export { default as RolesSettingsPage } from '../components/admin/settings/RolesSettingsPage.svelte';
```

Studio `+page.svelte` after refactor:

```svelte
<script lang="ts">
  import { MembersSettingsPage } from '@aphexcms/cms-core/client';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>
<MembersSettingsPage {data} />
```

#### 9.3 The `+page.server.ts` question (load functions)

Each settings page also has a `+page.server.ts` that does data loading
(see `members/+page.server.ts` — fetches pendingInvitations, inviteRoles).
Two options:

**Option A — load loaders too:** cms-core exports a function per page,
`loadMembersSettingsData(locals)`, that the studio calls from
`+page.server.ts`:

```ts
import { loadMembersSettingsData } from '@aphexcms/cms-core/server';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals }) => loadMembersSettingsData(locals);
```

**Option B — keep loaders studio-side:** the studio owns `+page.server.ts`
(load logic stays inline). cms-core only ships the visual component +
strict input prop type. Easier to extend per-app (add fields to `data`),
but each load function is duplicated.

**Recommendation: Option A**, with the loader function returning a typed
`MembersSettingsPageData`. The PageComponent's prop type is
`{ data: MembersSettingsPageData }`. End users who want to extend can:

```ts
export const load: PageServerLoad = async ({ locals }) => ({
  ...(await loadMembersSettingsData(locals)),
  customExtraField: await fetchCustomThing()
});
```

The PageComponent only reads the keys it knows about; extra fields are
ignored or forwarded to a slot/snippet (see §9.5).

#### 9.4 Extension surface (the "leaves it extendable" part)

Each PageComponent must accept Svelte 5 snippets for the common extension
points. For example, `MembersSettingsPage`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    data,
    headerActions,        // optional: add buttons next to title
    beforeMembersList,    // optional: insert content before the list
    memberRowExtras,      // optional: per-row append, takes member as arg
  }: {
    data: MembersSettingsPageData;
    headerActions?: Snippet;
    beforeMembersList?: Snippet;
    memberRowExtras?: Snippet<[member: Member]>;
  } = $props();
</script>
```

This is the Svelte 5 idiomatic way to say "wrappable but not forked." If a
user needs more than snippets allow, they skip the import and write their
own page — the studio is just reference code.

#### 9.5 Migration steps for Phase 9

1. **Set up the directory + barrel:**
   - Create `packages/cms-core/src/lib/components/admin/settings/`.
   - Add the five export lines to `packages/cms-core/src/lib/client/index.ts`.
   - Add a corresponding `loadXSettingsData(locals)` function per page
     under `packages/cms-core/src/lib/server/page-loaders/` (Option A above)
     and re-export from `lib/server/index.ts`.

2. **Move the easy two (already wrapper-shaped):**
   - Copy `apps/studio/src/routes/(protected)/admin/settings/_components/AccountSettings.svelte`
     to `packages/cms-core/src/lib/components/admin/settings/AccountSettingsPage.svelte`.
     Adjust imports if any are studio-local (`$lib/...` → relative paths in cms-core).
   - Same for `ApiKeysSettings.svelte` → `ApiKeysSettingsPage.svelte`.
   - Same for `OrganizationsSettings.svelte` → `OrganizationSettingsPage.svelte`.
   - Update studio `+page.svelte` to import from `@aphexcms/cms-core/client`.
   - Delete the studio `_components/` files **after** verifying the page
     renders identically.

3. **Extract the hard two (inline pages):**
   - Create `MembersSettingsPage.svelte` — paste the body of
     `members/+page.svelte`. Promote any `data.X` accesses to typed prop.
     Add snippet props for extension.
   - Create `RolesSettingsPage.svelte` — same.
   - Update studio `+page.svelte` files to thin wrappers (~5 lines each).
   - Verify visual + functional parity in browser.

4. **Add loader functions (Option A):**
   - For each page, lift the body of `+page.server.ts` into a function
     `loadXSettingsData(locals): Promise<XSettingsPageData>` in cms-core.
     Export the data type alongside.
   - Studio `+page.server.ts` becomes a one-liner.

5. **Template sync:**
   - Run `./scripts/sync-template.sh --apply`. Verify wrapper pages flow
     through.
   - Update `templates/base/CHANGELOG.md` Unreleased.
   - Rebuild create-aphex.

#### 9.6 Tests for Phase 9

PageComponents are pure presentational Svelte — testing them in isolation
is low-value (snapshot churn for visual changes). The realistic test
strategy:

- **Component prop-type tests:** `tests/page-components-types.test-d.ts` —
  uses `expectTypeOf` from vitest to assert `MembersSettingsPageData` shape
  matches what the loader returns. This catches loader/component drift.
- **Integration smoke test:** `tests/settings-pages.test.ts` —
  uses `@testing-library/svelte` to render each PageComponent with a
  fixture `data` prop and assert no runtime errors + key text appears.
  Already covered partially by the user-flow E2E if one exists; check
  `apps/studio/tests/` for Playwright/E2E config first — if none, this is
  the floor.

> **Note:** there is no Playwright/E2E config in `apps/studio/tests/`
> currently (see §1.6 inventory). The smoke test in vitest is the most
> we can build without adding new test infra. If you want true UI
> regression, that's a separate plan — out of scope here.

#### 9.7 Risks for Phase 9

| Risk | Mitigation |
|------|------------|
| Studio-local CSS/Tailwind classes don't resolve in cms-core context | All `@aphexcms/ui/shadcn/*` imports already work cross-package. Verify each component compiles after move with `pnpm -F @aphexcms/cms-core check`. |
| Hard-coded `$lib/...` or `$app/...` imports inside the moved components | Grep for `$lib/`, `$app/` in each component pre-move; refactor to dependency-injection (pass via props) or to `@aphexcms/cms-core/client`-resolvable paths. `invalidateAll` from `$app/navigation` is fine — it's a peer of SvelteKit. |
| Users who already customised `members/+page.svelte` lose their changes | This is a breaking change for downstream forks of the template. Call it out in `templates/base/CHANGELOG.md` with a migration note. |
| Snippet API churn — adding more snippet slots later breaks consumer apps | Snippets are optional props; adding new ones is non-breaking. Renaming or removing one IS breaking — version `cms-core` accordingly. |

---

## 4. Test strategy

### 4.1 Existing tests must keep passing (regression gate)

`apps/studio/tests/comprehensive-http-api.test.ts` is the single most
important test file. After migration:

- The `makeRequest()` helper at lines 85-142 **must be rewritten** because
  it imports `+server.ts` files that no longer exist. Replace with:

```ts
async function makeRequest(method: string, path: string, body?: any) {
  // Build the Hono app the same way hooks.server.ts does
  if (!apiApp) {
    apiApp = createAphexApi();
    // (register plugin routes / config.api here too if tests exercise them)
  }
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' }
  };
  return apiApp.fetch(new Request(url, init), {
    aphexCMS: cmsInstances,
    auth: mockAuth
  });
}
```

This is a **net simplification** — no more route-table switch, no fake
`event` object construction. This pays the proposal's "End-to-end testable
without SvelteKit" claim.

### 4.2 New test files

Create the following under `apps/studio/tests/`:

#### `tests/hono-catchall.test.ts` (Phase 0/1 gate)

Verifies the SvelteKit catch-all forwards correctly to Hono:

- `GET /api/__hono_smoke__` (a temp test route registered via
  `config.api`) returns 200 and the expected body.
- A 404 from Hono surfaces as a 404 to the SvelteKit response, not a
  SvelteKit 404 page.
- Headers (`x-forwarded-for`, content-type) round-trip correctly.

#### `tests/hono-plugin-routes.test.ts` (Phase 6 gate)

Verifies plugin route registration works:

- A test plugin with `api: (app) => app.get('/test-plugin/hello', c => c.json({ ok: true }))`
  registers and the route responds at `/api/test-plugin/hello`.
- Plugin routes can use Hono path params (e.g. `/test-plugin/:id`).
- Plugin route 500s are caught by Hono's error handler (verify error envelope).

#### `tests/hono-validation.test.ts` (Phase 2 gate)

Verifies `zValidator` parity with hand-rolled `safeParse`:

- Bad query string returns `{ success: false, error, issues }` with status
  400 — same shape as today (per `routes/documents.ts:22-30`).
- Bad JSON body returns same shape (per `routes/documents.ts:131-141`).
- Coerced query params (`page=2`) parse to numbers correctly.

#### `tests/hono-auth-context.test.ts` (Phase 2 gate)

Verifies `c.var.aphexCMS` and `c.var.auth` populate correctly from the
SvelteKit `locals` bridge:

- Request with mock auth → handler reads `c.var.auth` → `authToContext()`
  produces same result as today's `authToContext(locals.auth)`.
- Permission errors from `localAPI` return 403 envelope — confirms the
  ported try/catch behaves the same.

#### `tests/hono-rpc-client.test.ts` (optional, Phase 7+)

If we ship `hono/client` typed RPC:

- `apiClient.documents.$get({ query: { type: 'page' } })` returns a
  fully-typed response.
- TypeScript compile-time check that wrong query shape errors.

### 4.3 Test execution per phase

Add to `apps/studio/package.json`:

```json
"test:hono": "vitest run hono-"
```

CI gate: every phase must leave `pnpm test:http` and `pnpm test:hono` green.

### 4.4 What we do NOT need new tests for

- Zod schemas — already covered by existing comprehensive tests.
- Local API behaviour — orthogonal, already in `comprehensive-local-api.test.ts`.
- GraphQL — only the *registration mechanism* changes (Phase 6); the
  GraphQL endpoint itself is tested by `comprehensive-graphql-api.test.ts`.

---

## 5. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hono `c.env` vs `c.var` mistake — passing locals through `fetch(req, env)` and forgetting to lift into `c.var` | One bridging middleware at top of `createAphexApi()`. Tested in `hono-auth-context.test.ts`. |
| Streaming/binary responses (assets-cdn) regression | Diff response headers + body byte-length pre/post in `comprehensive-http-api.test.ts` for `/api/assets/[id]/cdn`. |
| Plugin exact-path routes break during transition | Keep `pluginRoutes` Map intercept in `hooks.ts` for one release. Both mechanisms coexist. |
| Template sync misses deleted files | `sync-template.sh` copies, never deletes (per `CLAUDE.md` §2). Manual delete step in Phase 7 is mandatory. Add a checklist comment in the changelog. |
| `routes-exports.ts` is publicly exported via `@aphexcms/cms-core/server` — downstream users may import `getDocuments` etc. directly | Grep-verify zero downstream usage **outside** apps/studio and templates before deletion. If any external usage suspected, keep file as deprecated re-exports for one release with a console warning on import (or just leave it — it's small). |
| `request.headers.set('x-forwarded-for', ...)` may throw if Request headers are immutable on some runtimes | Wrap in try/catch or clone the request first. djc-image-prep precedent confirms it works in adapter-node — we are also adapter-node. |
| Hono adds ~14kB to bundle. Acceptable. | No mitigation. |

---

## 6. Concrete first commit

Smallest shippable thing (Phase 0 + Phase 1 minus deletes):

1. `pnpm add -F @aphexcms/cms-core hono @hono/zod-validator`
2. Create `packages/cms-core/src/lib/server/api/index.ts` (empty app + bridge middleware).
3. Create `packages/cms-core/src/lib/server/api/routes/schemas.ts` (port).
4. Mount `/schemas` in the app.
5. Add `apiApp` to `CMSInstances` and build it at end of `hooks.ts` init.
6. Create `apps/studio/src/routes/api/[...slug]/+server.ts` catch-all.
7. **Do not delete** `apps/studio/src/routes/api/schemas/+server.ts` yet —
   verify catch-all-vs-specific precedence on a route Hono *does* handle by
   removing one shim and confirming the request flows through Hono.
8. Add `tests/hono-catchall.test.ts` and `tests/hono-validation.test.ts`.
9. Run `pnpm -F @aphexcms/studio test:http` — must pass.
10. Run new tests — must pass.

If green: this commit proves the architecture. Subsequent phases are
mechanical ports.

---

## 7. What is NOT in this plan (matches proposal "Out of scope")

- `needle-di` / DI container — not needed; services already on `locals.aphexCMS`.
- Replacing non-API SvelteKit routes — studio UI stays as SvelteKit pages.
- OpenAPI generation via `hono/zod-openapi` — worthwhile, but separate work.

---

## 8. Open questions — all resolved

1. ~~**Studio-local routes (Phase 5):**~~ **RESOLVED** — register from
   `aphex.config.ts` via `config.api: (app) => {...}`. Handlers live under
   `apps/studio/src/lib/server/api/` outside the SvelteKit routes tree.

2. ~~**`routes-exports.ts` deletion:**~~ **RESOLVED — delete it.** Same PR
   as the last route port (Phase 7). No deprecation window. Grep-verify zero
   usage outside `apps/studio` and `templates/base` before the delete commit.

3. ~~**`CMSPlugin.routes` field:**~~ **RESOLVED — strip the entire
   plugin scaffolding.** Verified zero callers: no `plugins:` in any
   `aphex.config.ts`, no `defineAphexPlugin()`, no `CMSPlugin`
   implementations. Phase 6 deletes `CMSPlugin`, `CMSPluginConfig`,
   `CMSPluginReference`, `plugins?:`, `resolvePlugin()`, and the
   `pluginRoutes` Map. The built-in GraphQL handler — currently the only
   thing using the Map — registers directly on `apiApp`. A real plugin
   API can be designed when there's a real plugin to design it for.

4. ~~**Test scope:**~~ **RESOLVED — add broader integration tests where
   cheap.** Specifically:
   - **Multi-tenant org-switching through the catch-all** — extend
     `comprehensive-http-api.test.ts` to swap auth context mid-suite and
     verify org isolation. Mostly already covered by existing assertions;
     just exercise via `apiApp.fetch()` once `makeRequest()` is rewritten.
   - **Plugin + config.api coexistence** — one test that registers both a
     plugin route and a `config.api` route in the same app and hits both.
     Cheap insurance that registration order doesn't matter.
   - **Catch-all precedence sanity** — single test confirming that if a
     specific `+server.ts` exists (e.g. studio's `seed-movies`), it wins
     over the catch-all. Two-line test, free.

   Skip: load testing, perf benchmarks, OpenAPI conformance — out of scope.

5. ~~**PageComponents loader strategy (Phase 9.3):**~~ **RESOLVED —
   Option A.** cms-core ships `loadXSettingsData(locals)` per page.
   Studio `+page.server.ts` files become one-liners. Loader fixes ride
   along with cms-core upgrades.

6. ~~**PageComponents extension surface (Phase 9.4):**~~ **RESOLVED —
   ship the floor, grow reactively.** Initial snippet set per page:
   - **All pages:** `headerActions`, `beforeContent`, `afterContent`
   - **`MembersSettingsPage`:** `memberRowExtras: Snippet<[member]>`
   - **`RolesSettingsPage`:** `roleRowExtras: Snippet<[role]>`
   - **`ApiKeysSettingsPage`:** `apiKeyRowExtras: Snippet<[key]>`

   Snippets are optional + additive — adding more in future minor versions
   is non-breaking. Removing or renaming is breaking; treat that as a major
   bump. Drive future additions from real downstream requests, not
   speculation.
