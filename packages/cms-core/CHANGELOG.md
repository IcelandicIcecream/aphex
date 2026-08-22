# @aphexcms/cms-core

## 9.10.0

### Minor Changes

- [#301](https://github.com/IcelandicIcecream/aphex/pull/301) [`1f29e3f`](https://github.com/IcelandicIcecream/aphex/commit/1f29e3f4fdb4acdbc6bf709398564e9a770b5e1c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an opt-in `public` option to `find`/`findByID`/`get` that strips `_meta.organizationId`, `createdBy`, `updatedBy`, and `publishedHash` from returned documents before they leave the call.

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

- [#301](https://github.com/IcelandicIcecream/aphex/pull/301) [`1f29e3f`](https://github.com/IcelandicIcecream/aphex/commit/1f29e3f4fdb4acdbc6bf709398564e9a770b5e1c) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add search to the admin document list. A magnifying-glass icon in the list toolbar reveals a search box that filters documents server-side (debounced, 300ms) via a new `search` query param on `GET /documents`.

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

## 9.9.0

### Minor Changes

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Close three gaps in the auth surface.

  **API-key revocation now fails closed.** Deleting a key removes the row and evicts the cached
  copy the api-key plugin keeps as secondary storage. If that eviction failed, the row was gone but
  a live key stayed in cache — revocation reported success while the key kept authenticating.
  Eviction now retries three times with backoff and, if it still fails, throws the new
  `ApiKeyRevocationError` (exported as a value, so route handlers can `instanceof` it and tell an
  incomplete revocation from an ordinary delete failure). The caller sees a 500 rather than a false
  "revoked".

  **The password-reset facades are rate-limited.** `POST /api/user/request-password-reset` and
  `/reset-password` call the auth provider _server-side_, and Better Auth's limiter — like its other
  request-shaped guards — only engages for calls carrying a real `ctx.request`. Both endpoints were
  therefore completely unthrottled: one sends email, the other checks tokens, and anyone could reach
  them. Each now has two buckets, because either alone is porous — one on the client address, one on
  the thing an attacker can't rotate freely (the target address, or the token being retried). Every
  bucket is consumed on each request rather than short-circuiting on the first failure, so tripping
  one limit can't keep another permanently fresh.

  `RateLimiter` and `clientAddress` are exported from `@aphexcms/cms-core/server` for apps adding
  their own unauthenticated endpoints. Stated plainly: it is per-process memory, so behind N
  instances the effective limit is N× what's configured and a restart forgets every window. It turns
  "unlimited" into "bounded per instance", which is the difference between an email bomb and a
  nuisance; a deployment needing a hard guarantee should put a limiter in front of the app.

  **API-key deletion is gated on `apiKey.manage`**, the same capability that gates issuing one.
  It previously checked an inline role list that happened to include `editor`, so the two halves of
  the same permission disagreed. **Editors lose the ability to delete API keys** — if you were
  relying on that, grant `apiKey.manage` to the editor role.

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Make the activity page operable, not just observable.

  The job/event history was already there; what was missing was the ability to act on what it
  showed. A dead-lettered job could be read but not restarted, and a stalled relay was invisible —
  the queue simply looked idle, which is exactly what a healthy queue looks like too.
  - **Retry and cancel**, gated on the `org.settings` capability. Both are guarded in SQL rather
    than by a read-then-write: a job another worker leases in between stops matching the `WHERE`
    and the action reports a conflict instead of racing the settle.
  - **Relay backlog banner** — pending outbox count and the age of the oldest unprocessed row.
    This is the "is the worker running?" signal; without it an unrun relay is indistinguishable
    from no work.
  - **Instance-wide scope** for super admins, so a single organization's view isn't the only way
    to find a job.
  - `ActivityView` is exported from `@aphexcms/cms-core/client/ui` (the narrow barrel — it's plain
    fetch and tables, and belongs nowhere near the field-editor chunk).

  **`EventJobAdapter` gained three required methods**, so a third-party adapter will not compile
  until it implements them. Both first-party adapters do.
  - `outboxHealth({ organizationId? })` — backlog size and oldest pending timestamp. Omit the org
    for the instance-wide figure.
  - `getJob(organizationId, id)` — single job read, so a caller can tell "gone" from "not allowed".
  - `requeueJob(organizationId, id, { runAt })` — the operator's undo for a dead letter.

  `requeueJob` is deliberately separate from `retryJob` rather than a reuse of it. `retryJob` is the
  _runner's_ backoff transition and leaves `attempts` untouched; a dead-lettered job sits at
  `attempts === maxAttempts`, so handing it back through that path would only re-exhaust it on the
  next claim. `requeueJob` resets the attempt counter and clears `lastError`, and is restricted to
  `failed` and `cancelled` — requeueing a `pending` job is a no-op and requeueing a `leased` one
  would race its current owner.

### Patch Changes

- [#298](https://github.com/IcelandicIcecream/aphex/pull/298) [`cda2dfd`](https://github.com/IcelandicIcecream/aphex/commit/cda2dfd2f8113d3d423e5acda985410246293353) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add `@aphexcms/auth` — Better Auth instance, session/API-key service, `AuthProvider`, and the
  dialect-split Drizzle tables behind a single `createAphexAuth()` call. Better Auth stays a peer
  dependency, and `betterAuth: (base) => …` remains a full escape hatch.

  Includes:
  - **Two-factor authentication (TOTP)** via `twoFactor: true`. The `two_factor` table and
    `user.two_factor_enabled` ship in the schema unconditionally, so enabling 2FA is a config change
    rather than a migration. The table carries the union of Better Auth 1.5 and 1.6 columns, since the
    supported peer range spans both.
  - **Opt-in OAuth** through `socialProviders`, typed off Better Auth rather than restated, so provider
    option shapes can't drift from the installed version.
  - **Pluggable bootstrap** (`bootstrap`) deciding who claims a fresh instance, with four recipes:
    `openFirstUser()` (the default — first signup wins, as in WordPress, Ghost, Strapi, Payload and
    Dokploy), plus three opt-in hardenings: `claimCode()` (also requires a code printed to the server
    log, which the sign-up form prompts for while `isInstanceUnclaimed(db)` holds), `allowlistEmail()`,
    and `never()`. A recipe carries its own startup work via an optional `policy.prepare(db)`, so
    switching recipes never strands app-level wiring.
  - **`inviteOnly` now defaults to `true`**, and gained a bootstrap exception: sign-up is allowed while
    the instance is _provably_ empty (an adapter that can't answer falls through to the gate rather
    than being waved past). Together with `openFirstUser()` this makes the out-of-the-box flow "the
    first person to sign up owns the instance, and the door shuts behind them" — no public
    registration left open, and nothing to configure. **Breaking** for anyone relying on the previous
    `false` default; opt out with `inviteOnly: false`.

  Bring-your-own-auth is now real rather than nominal. Sign-up gating and bootstrap promotion moved
  into cms-core (`assertSignUpAllowed`, `createUserProfileWithBootstrap`, plus the recipes and
  `isInstanceUnclaimed`), so they're enforced behind the `AuthProvider` port instead of inside Better
  Auth wiring. An app on Keycloak or Supabase now inherits them; previously `inviteOnly: true` would
  be configured and silently do nothing. Bootstrap recipes are imported from `@aphexcms/cms-core/server`,
  not `@aphexcms/auth`.

  Shared predicates replace definitions that had drifted: `isPendingInvitation` / `isExpired` /
  `isAccepted` / `isStaleInvitation` (7 call sites, 3 disagreeing) and `isInstanceEmpty` /
  `canDetermineInstanceEmptiness` (6 call sites carrying the same fail-closed rule by hand).

  The studio now builds auth with `createAphexAuth()`, deleting ~850 lines of duplicated instance and
  service code that had to be patched in parallel.

  Security fixes:
  - **`deleteApiKey` was a stub** that logged and returned `true` without deleting anything. Now issues
    a real delete scoped by owner in the WHERE clause, so one account can't remove another's key by
    guessing its id.
  - **Expired invitations no longer deadlock an address.** The re-invite check tested only `acceptedAt`
    while the sign-up gate and members list also required `expiresAt > now`, so a lapsed invitation was
    simultaneously unusable, invisible in the UI, and blocking any replacement.
  - **API keys can no longer forge tenant or scope.** Key metadata is client-writable via Better Auth's
    own `/api-key/create`, but was previously trusted for `organizationId`, `permissions`, and
    `capabilities`. It's now treated as a claim: the owner's membership is re-checked per request, and
    grants are clamped to what that owner's role actually confers.
  - **Bootstrap no longer fails open.** `hasAnyUserProfiles` is optional on the adapter interface, and a
    missing implementation previously read as "no users exist", promoting every signup to super admin.
  - **Cross-collection access is blocked** in `CollectionAPI`: permissions are checked against the
    addressed collection while lookups were keyed on the globally-unique document ID, letting a caller
    reach a known ID in a restricted collection. A type mismatch now reports "not found".
  - **Organization settings** evaluate capabilities against the target organization rather than the
    caller's active one.

- Updated dependencies [[`200e7ab`](https://github.com/IcelandicIcecream/aphex/commit/200e7abe6809251d48f72c11872d1caa8700a002), [`8bcb494`](https://github.com/IcelandicIcecream/aphex/commit/8bcb4946e116c1fd253b10b9116667a425190903)]:
  - @aphexcms/ui@0.8.5

## 9.8.1

### Patch Changes

- [#295](https://github.com/IcelandicIcecream/aphex/pull/295) [`5001d85`](https://github.com/IcelandicIcecream/aphex/commit/5001d855d124e6ed8805ce0015db8a59b4946265) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix a runtime import that broke every document write, publish, version restore, and agent change-set request in 9.8.0: `Failed to load url ../../../db/interfaces.js`.

  Four route modules imported `RevisionConflictError` from the **directory** `'../../../db/interfaces'` rather than `'../../../db/interfaces/index'`. The build rewrites a bare specifier by appending `.js`, producing `db/interfaces.js` — a file that doesn't exist, since the directory ships as `db/interfaces/index.js`. Inside the monorepo the same import resolves fine (the bundler finds the directory's index), so this only ever surfaced in a real install from the published tarball.

  Type-only imports of the same path were unaffected — they're erased at compile time and never emit a specifier — which is why this landed with the compare-and-swap work: `RevisionConflictError` is the first _value_ imported from that directory by a route, so it's the first one to emit a runtime import.

  Fixed in `documents-by-id.ts`, `documents-publish.ts`, `document-versions.ts`, `agent-change-sets.ts`, and normalized `services/references-service.ts` to the same `db/interfaces/index` form the rest of the package already uses.

## 9.8.0

### Minor Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an audit/undo trail for the in-admin AI assistant's writes — `cms_agent_change_sets` (one row per agent turn, capturing `provider`/`model`/`promptTokens`/`completionTokens` for cost/usage auditing regardless of whether the turn mutated anything) and `cms_agent_operations` (one row per mutating tool call, with the document-version numbers an undo restores between).
  - New `AgentChangeSetAdapter` port (`createChangeSet`/`recordOperation`/`completeChangeSet`/`getChangeSet`/`listChangeSets`), implemented in both relational adapters, mirroring the `EventJobAdapter`/`cms_domain_events` schema pattern (org-scoped, RLS on Postgres, WHERE-scoped on SQLite) — proven identical across dialects by the cross-dialect conformance suite.
  - `POST /api/agent/chat` now eagerly creates a change-set per turn and records every mutating tool call against it, best-effort (a recording failure never breaks the chat itself).
  - New `POST /api/agent/change-sets/:id/undo` reuses the existing CAS-guarded `VersionService.restoreVersion` — the same primitive the document editor's own version-restore already calls — so undo is not new revert logic, just "restore to the version before this operation," applied in reverse order. Known limitation: `create_document` operations aren't undoable (no delete primitive wired in), and undo never auto-unpublishes.
  - `ActivityView.svelte` gains an "Agent Changes" tab: change-set list with provider/model/token counts, expandable per-turn operation detail, and an Undo button.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`58d92a8`](https://github.com/IcelandicIcecream/aphex/commit/58d92a854d6bde5204d1415cf25f301d85ae1983) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the streaming transport for the in-admin content agent (Milestone 2 item 5 of `references/content-copilot-phase-1-plan.md`), built on the already-typechecked `AIProviderAdapter` port:
  - `types/agent-stream.ts` — `AgentStreamEvent`, the browser-facing wire contract (`AIStreamEvent` plus a `toolResult` event carrying an executed tool's outcome).
  - `ai/run-agent-turn.ts` — `runAgentTurn`, a transport-agnostic tool-calling loop: streams the model's response, executes requested tool calls against the caller's resolved tool list (re-checking `requiredCapabilities` at execution time, not just at advertisement), feeds results back as `tool` messages, and repeats until the model stops or a `maxToolRoundtrips` safety cap (default 8) is hit.
  - `POST /api/agent/chat` — session-authenticated SSE endpoint (mounted on the shared `apiApp`, so no per-app route re-export is needed, unlike MCP), 404s when no `aiProvider` is configured, streams `AgentStreamEvent`s built on `runAgentTurn`. Stateless per call; conversation persistence is not part of this change.
  - `mcp/tools.ts` exports `resolveAgentTools` (extracted from `buildContentTools`) — the one shared, capability-filtered tool-resolution path both MCP and this new endpoint use, so they can never drift on what a caller is allowed to see or invoke.
  - `CMSConfig` gains `agentModel?: string`, the default provider-specific model id the chat endpoint uses when a request doesn't override it.

  Not yet done: runtime-testing against a live provider API key, and wiring an `aiProvider` into `apps/studio/aphex.config.ts` (a separate app-level decision).

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add chunk-load/hung-navigation recovery, importable as `@aphexcms/cms-core/chunk-recovery` — a standalone, zero-dependency module for a public-facing site's `hooks.client.ts` (plus its root `+layout.svelte`) that masks a transient CDN/proxy hiccup — a dropped connection to the origin, or a stale cached HTML document referencing a since-replaced hashed filename — that would otherwise leave a visitor stuck on an unresponsive page. Three distinct gaps, three functions:
  - `installChunkLoadRecovery()` — the _initial_ hydration path: if the entry module itself fails to load, a `window` listener reloads the page once.
  - `handleChunkLoadClientError(error, destinationUrl?)` — a failed client-side _navigation_ (clicking a link to a lazily-loaded route) is caught by SvelteKit's router internally and routed through `handleError` instead, never becoming a global `window` event — confirmed live via a real "click a link, nothing happens" report. Reloads straight to `destinationUrl` (pass `event.url` from `HandleClientError`) rather than the current address, since SvelteKit doesn't update the address bar until a navigation resolves.
  - `installNavigationTimeoutRecovery(timeoutMs = 4000)` — both of the above only fire once SvelteKit/the CDN has already decided the navigation failed, which can ride on a slow gateway timeout (observed live: ~90s on an actual 522). Pre-empts that by forcing a hard navigation to the destination if a client-side navigation hasn't finished within `timeoutMs`, instead of leaving a visitor watching a dead click for a minute-plus. Must be called during a `.svelte` component's initialization (root `+layout.svelte`), not from `hooks.client.ts`.

  Guarded to reload/navigate at most once per session across all three, so a genuinely down origin doesn't loop. Deliberately not exported from `/client`: that barrel pulls in the admin UI component tree, and this needs to stay light enough for the hottest of hot paths — every visitor's initial page load. Wired into `apps/studio` and both `templates/base`/`templates/blog` as the reference usage.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`336b6a1`](https://github.com/IcelandicIcecream/aphex/commit/336b6a156331c32b982996d37c54e580d6fcf765) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the workspace bridge for the in-admin content agent (Milestone 3 of `references/content-copilot-phase-1-plan.md`) — lets the agent edit the document a user currently has open in `DocumentEditor.svelte`, buffered against the live editor state and flushed as a single CAS-guarded save, instead of only being able to write straight to the DB.
  - `types/document-workspace.ts` — the `DocumentWorkspace` interface (`getSnapshot`/`apply`/`validate`/`flushSave`/`publish`/`beginBatch`/`endBatch`) a live document session exposes; deliberately shaped as "a live handle onto a document's editable state" rather than "what the AI needs," so a future multiplayer feature can reuse the same primitives.
  - `document-workspace-registry.svelte.ts` — module-level singleton (same pattern as `agent-chat-state.svelte.ts`) tracking which document sessions are currently open in this tab.
  - `ai/content-workspace-tools.ts` — `content_patch_fields`/`content_save_draft`, both `execution: 'workspace'`; their `execute` bodies are unreachable by design, since `run-agent-turn.ts`'s pause branch guarantees they're never called server-side.
  - `ai/run-agent-turn.ts` — partitions a round's tool calls by `execution`, runs `server`-mode calls as before, and pauses (`finishReason: 'awaiting_workspace_tool'`) instead of executing `workspace`-mode calls, leaving them for the client to resolve against the registered `DocumentWorkspace` and resume.
  - `mcp/tools.ts`'s `resolveAgentTools(deps, opts?)` gains an optional `{ documentContext }` param: appends the two workspace tools only when a document context is present, and **removes `update_document` from the list** in that case — a document open in the editor now has exactly one write path (the workspace tools), not a prompt-level preference the model could still bypass.
  - `DocumentEditor.svelte` builds a `documentWorkspace` object and registers it on mount; `AgentChat.svelte` cross-checks it against the URL's `docType`/`docId` before attaching `documentContext`, resolves paused tool calls, and auto-flushes via `content_save_draft` if the model applied patches but never explicitly saved.
  - `document-refresh.svelte.ts` gains `getCollectionVersion`/`notifyCollectionChanged` (sibling to the existing per-document version pub/sub) so a collection **list** view refreshes after the agent creates/updates/publishes a document elsewhere in the session; `AdminApp.svelte` debounces the refetch (300ms) so a bulk agent operation doesn't fire one refetch per document.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`657db9e`](https://github.com/IcelandicIcecream/aphex/commit/657db9e3ec1f2251bc98fd2e132616a050545d6e) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix the missing publish controls on a referenced document opened in presentation (visual-editing) mode, make a list row's edit marker point at the row rather than the whole field, and raise the reference picker's search ceiling.

  **cms-core**
  - `AdminApp.svelte`: the primary editor's wrapper is now `overflow-y: hidden` in presentation mode. The stacked reference panel is an `absolute inset-y-0` sibling inside that wrapper, and for a _scroll container_ the containing block of an absolute child is the padding box — the whole scrollable extent, not the visible height. With `auto` the panel stretched to the scroll height and pinned its footer (Publish / Schedule / Unpublish) below the fold, so a referenced document looked like it had no publish controls at all; the bar visible at the bottom of the window was the base editor's showing through. Nothing is lost by disabling it there: in presentation mode `DocumentEditor` is `h-full overflow-hidden` and scrolls its own field column.
  - `DocumentEditor.svelte`: new `hideActionBar` prop, set by `AdminApp` on the base document while a reference panel is stacked over it in presentation mode. Two action bars in the same corner give no clue which document each one publishes. Hides the bar only — the document keeps auto-saving and its status stays in the header. Not applied to the ordinary side-by-side stacked panel, where each bar already sits under its own column.
  - `ReferenceField.svelte`: the reference picker fetches 200 documents instead of 20. The picker filters client-side over that cache, so the fetch limit was also the search limit — anything beyond it could never be found by typing, making documents silently unreachable in any collection larger than a screenful (a menu of 36 dishes could only ever surface the first 20). This raises the ceiling rather than removing it; collections beyond 200 still need server-side search, which the list endpoint doesn't expose today.
  - `ArrayField.svelte`: array rows now carry `data-array-index`, the DOM hook the visual editor reads to resolve a click to a specific row.

  **visual-editing**
  - `PreviewApi` gains `documentType` — the schema type currently open in the editor, or `null` outside preview. It's how a page reachable from several document types picks what a click should do.
  - `edit()` accepts `{ field, arrayIndex }` to target a field, or a specific row of it, in the open document, rather than only another document by `{ id, type }`. Revealing the row is what lets an author reorder or remove it, which opening the referenced document does not.
  - The hover overlay's label appends `[n]` for a list entry. Several rows of one list otherwise all read as the same bare field name, with nothing to say which slot is which.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`64706f9`](https://github.com/IcelandicIcecream/aphex/commit/64706f9d334085e61e51d7ca0a42664f448a51bc) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Reframe the 14 built-in MCP content tools onto the new `AgentToolDefinition`/`AgentToolExecutor` contract (Milestone 2 of `references/content-copilot-phase-1-plan.md`) — same tool behavior, but now defined once as a static `contentAgentTools` array (each a `{ definition, execute }` pair, `execute` receiving services as a call-time argument rather than a per-request closure) instead of being rebuilt fresh on every MCP connection. `buildContentTools()` is now a thin adapter from this list into the MCP SDK's expected shape, so this is purely an internal reframing — the MCP route and every tool's external behavior are unchanged. Sets up the same tool list to eventually serve a future in-admin agent panel through one shared execution path, per the plan's ownership boundary.

  `buildContentTools()` also now merges in plugin-contributed `aphex/agent/tool` parts via `partResolver.agentToolsForCapabilities()`, filtered by the calling API key's resolved capabilities — a plugin's own tool is reachable over MCP without any app-level wiring, matching how `aphex/event/consumer`/`aphex/job/handler` already self-register. A core tool name always wins a collision with a plugin tool. This closes the last open item under Milestone 2's tool-reframe step.

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add compare-and-swap (CAS) concurrency control for document writes — Milestone 1 of the content-copilot plan (`references/content-copilot-phase-1-plan.md`), and useful on its own: two browser tabs open on the same document no longer silently clobber each other.
  - `cms_documents` gains a monotonic `revision` column, incremented on every draft write.
  - `updateDocDraft`/`publishDoc`/`unpublishDoc` (both adapters) and `VersionService.restoreVersion` accept an optional `expectedRevision`; a mismatch throws `RevisionConflictError` (`documentId`/`expectedRevision`/`currentRevision`) instead of overwriting. Omitting `expectedRevision` preserves the previous unconditional last-write-wins behavior — fully backward compatible.
  - Threaded through `CollectionAPI.update`/`publish`/`unpublish`, the zod request/response schemas (`expectedRevision` in, `revision` out via `_meta`), and the HTTP routes (`RevisionConflictError` → 409 with `currentRevision`).
  - `DocumentEditor.svelte` sends the revision it last read on autosave, publish, unpublish, and version-restore, and surfaces a 409 distinctly ("this document was changed elsewhere, reload") instead of a generic save error or a silent overwrite.
  - Fixed a gap the cross-dialect conformance suite caught: `PostgreSQLAdapter`/`SQLiteAdapter`'s org-hierarchy wrapper (the class `apps/studio` actually talks to) wasn't forwarding `expectedRevision` to the underlying document adapter, so CAS would have been a no-op end-to-end despite being correctly implemented one layer down. Fixed by threading the parameter through a shared `withHierarchyFallback` helper (also de-duplicating four near-identical hierarchy-retry blocks per adapter).
  - New cross-dialect conformance coverage (`packages/sqlite-adapter/tests/conformance.spec.ts`, run against both pglite and libsql): revision incrementing, the two-tabs stale-write rejection, publish/unpublish CAS, and unconditional-write-still-works-when-omitted.

### Patch Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`1771663`](https://github.com/IcelandicIcecream/aphex/commit/1771663f2197648e9b20b75871bf87de6d9dae3a) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix array fields silently accepting malformed items. Two gaps, both closed:
  - Schema-definition validation now rejects an `array` field declared with no
    `of` (or an empty `of`) instead of passing it clean.
  - Document-data validation now actually validates array items against `of` —
    previously `validateValueShape`'s `'array'` case only confirmed the value
    _was_ an array and never inspected item shape, so a mistyped or malformed
    item (wrong `_type`, missing required nested fields, a string where an
    object was declared) passed validation silently regardless of whether `of`
    was well-formed. Item resolution mirrors `ArrayField.svelte`'s own matching
    (`ref.name === item._type || ref.type === item._type`, falling back to the
    sole entry only for untagged items in a single-type array — an item
    carrying an explicit, unrecognized `_type` is always an error, never
    silently coerced). Inline object items recurse into their own `fields`, so
    arbitrarily nested arrays-of-objects-with-arrays validate at every depth,
    with a clean dotted/bracketed error path (e.g.
    `sections[0].items[2].label`) rather than repeated wrapping.

  Also fixes `ArrayField.svelte` and the exported `isBlockArray` helper
  throwing when `field.of` is missing, instead of the previous inconsistency
  (admin UI crash vs. silent API accept for the same malformed schema).

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`8408587`](https://github.com/IcelandicIcecream/aphex/commit/84085872e0104d40bafd383ef2fb188b56db6dcb) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix a missing authorization check on the MCP `list_assets`/`upload_asset` tools — unlike every other document tool (which run through `CollectionAPI`, permission-checked transitively), these two called `assetService.findAssets`/`uploadAsset` directly with no capability check, so an API key without `asset.read`/`asset.upload` could still list or upload assets via MCP. Both tools now require the matching capability, returning a forbidden error otherwise — same as the HTTP asset routes.

- [#292](https://github.com/IcelandicIcecream/aphex/pull/292) [`0108350`](https://github.com/IcelandicIcecream/aphex/commit/0108350f2eee7d89651fc4e89a8140ba49c1b646) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix three admin/type-gen bugs found while building out a client project's plugins:
  - `type-gen`'s esbuild pass (used to compile+import `aphex.config.ts` outside
    Vite) now stubs `$env/*` imports to an empty object instead of failing the
    whole build — a plugin/schema module importing `$env/dynamic/public` (or
    any other `$env/*` variant) just to read a default config value no longer
    breaks type generation.
  - `ObjectModal`'s title now falls back to a title-cased `schema.name` when a
    nested object schema (e.g. an array item type) has no `title` set, instead
    of rendering `Edit undefined`.
  - `ObjectModal`'s panel now sets `cursor-default`, overriding a `cursor:
pointer` that could otherwise inherit onto the whole modal from an app-level
    `[role="button"]` cursor rule matching the modal's backdrop.
  - Click-to-edit stega encoding and the array item click target now resolve
    named object-type references (e.g. `{ type: 'doctorGridBlock' }`) from the
    schema registry, not just inline `fields`, so page-builder block items are
    clickable in the live preview.

## 9.7.0

### Minor Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`20b10c5`](https://github.com/IcelandicIcecream/aphex/commit/20b10c53987605fd8e3cb77156eb6b2753fed6d0) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the durable event + job spine (Phase 1): an append-only domain-event log, a DB-backed job queue, and a transactional outbox — all cross-dialect (Postgres/pglite/SQLite).

  **cms-core**
  - `withTransaction` is now **required** on `DatabaseAdapter` (was optional). Both first-party adapters already implement it; this removes the non-atomic fallbacks in `VersionService`. Custom adapters must implement it.
  - New `EventJobAdapter` port on `DatabaseAdapter`: `appendEvent` / `getEvent` (append-only event log) and `scheduleJob` / `claimDueJobs` / `completeJob` / `retryJob` / `failJob` (job queue with leases + idempotency keys). Callable on the tx handle from `withTransaction`, so emitting an event or scheduling a job is atomic with the state change that caused it (transactional outbox).
  - `defineEvent(type, zodSchema)` — a typed event catalog helper (mirrors the API-contract pattern), plus the built-in `document.published` definition. New universal types: `DomainEvent`, `Job`, `AppendEventInput`, `ScheduleJobInput`, `ClaimJobsOptions`, etc.
  - `create({ publish })` is now atomic: create + draft snapshot + publish + publish snapshot commit in one transaction instead of four separate implicit ones. `document.published` is emitted inside the publish transaction on every versioned publish path.
  - **Job worker:** `runDueJobs()` — claims a bounded batch of due jobs, runs each type's registered handler, and settles it (complete / retry with exponential backoff + jitter / dead-letter after `maxAttempts`). Handlers and a shared `workerSecret` are configured via `CMSConfig.jobs`. A secret-gated `POST /api/internal/workers/run` endpoint drives one batch (404 when no secret is set, so it's never an unauthenticated surface by default); platform cron or a self-hosted poll loop calls it on a cadence.
  - **Scheduled publish/unpublish:** built-in `document.publish` / `document.unpublish` job handlers, plus `collection.schedulePublish()` / `scheduleUnpublish()` (Local API) and `POST /api/documents/:id/schedule`. Scheduling is permission-checked at schedule time; the job re-runs `publish()` at `runAt` (re-validating + guarding references), so invalid content fails/retries instead of publishing, and `document.published` is emitted on the scheduled path exactly like a manual publish. **Replace semantics**: scheduling replaces any existing pending schedule for the document (at most one → no accidental double-publish), and `runAt` is floored to the minute. The editor has a calendar+time schedule dialog and a banner under the title ("Scheduled to be published on Monday at 8:00 AM") with reschedule/cancel, backed by `GET`/`DELETE /api/documents/:id/schedule` and the adapter `cancelJob` method.
  - **Read-only history / observability:** `listEvents` / `listJobs` adapter methods + `GET /api/events` and `GET /api/jobs` (gated on `document.read`, paginated, filterable by type/status), surfaced in a top-level **Activity** admin view (`ActivityView`). Jobs and the domain-event log are queryable rows in your own DB — no external store.

  **postgresql-adapter / sqlite-adapter**
  - New `cms_domain_events` and `cms_jobs` tables (organization-scoped; RLS policies on Postgres, `WHERE`-based isolation on SQLite), and the `EventJobAdapter` implementation. **Requires a migration** on Postgres (`drizzle-kit generate` + `migrate`); SQLite picks the tables up via push-on-boot.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an embedded in-process job runner (`config.jobs.embedded`) — a third way to
  drive the queue alongside platform cron and the self-hosted poll loop. It calls
  `runJobsBatch` on an interval from inside the running app (no HTTP endpoint, no
  worker secret), so scheduled publishes and event consumers run with zero setup.
  Ideal for local dev and single-instance self-hosting; ticks never overlap and a
  failing tick is logged and swallowed so the loop survives transient errors.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Event consumers now receive the configured `emailAdapter` in their context, so a
  consumer can send notifications (e.g. a form's "new submission" email) durably
  and out of band. `FormDefinition` also gains an optional `notifyEmail` for
  per-form notification routing.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a generic plugin storage primitive — `cms_plugin_storage`, the data-plane
  sibling of `cms_plugin_settings`. Plugins persist arbitrary org-scoped JSON
  records namespaced by `(plugin, collection)` through the new
  `PluginStorageAdapter` port (`createPluginRecord` / `getPluginRecord` /
  `listPluginRecords`), implemented by both the PostgreSQL and SQLite adapters.
  `createPluginRecord` is callable on the `withTransaction` handle, so a record
  and the domain event announcing it commit atomically (transactional outbox).

### Patch Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - The `datetime` field validator now accepts canonical ISO-8601 (e.g.
  `new Date().toISOString()`) in addition to `YYYY-MM-DD HH:mm`, so a
  `beforeValidate` hook that stamps an ISO timestamp no longer fails validation.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Scheduling refinements. The schedule button now mirrors the Publish button's
  state (disabled when there are no unpublished changes), and a manual
  publish/unpublish cancels any pending **same-direction** scheduled job — so the
  queue can't fire a late duplicate and re-emit `document.published` /
  `document.unpublished`. An opposite-direction schedule is left intact.

## 9.6.0

### Minor Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`3cab505`](https://github.com/IcelandicIcecream/aphex/commit/3cab505c0d471ef2f7ddc028bf0c6cbbe6116d08) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a narrow `@aphexcms/cms-core/client/api` entrypoint that exports only the
  API client functions (no Svelte components). Importing anything from the main
  `@aphexcms/cms-core/client` barrel pulls the entire admin UI graph — including
  the TipTap rich-text editor and @dnd-kit — into that route's chunk (~1.18 MB
  min / 328 kB gzip), even for a page that only calls an API function.

  Non-breaking: the existing `/client` barrel is unchanged. Utility pages that
  only need the API (e.g. an invitations screen, god-mode) can repoint their
  import to `/client/api` to drop the editor bundle from that route:

  ```diff
  -import { invitations, organizations } from '@aphexcms/cms-core/client';
  +import { invitations, organizations } from '@aphexcms/cms-core/client/api';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`c14d1c1`](https://github.com/IcelandicIcecream/aphex/commit/c14d1c19e5ad9303e74a291e8e62f081969237e3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a `@aphexcms/cms-core/client/ui` entrypoint: the admin chrome and context
  primitives (Sidebar, ConfirmDialog, permissions/schema/slots/nav contexts,
  PluginSettingsPanel, API client, toast) without the document editor or field
  widgets.

  The full `/client` barrel also re-exports DocumentEditor, SchemaField, AdminApp
  and every `*Field` component, which pull the field registry (+@dnd-kit, +lucide)
  into one chunk (~337 kB min / ~110 kB gzip). Because Rollup's download unit is
  the chunk, a page that only wants a Sidebar or a confirm dialog still downloaded
  that whole chunk just by sharing the barrel.

  Non-breaking: `/client` is unchanged. Admin pages that don't mount the editor
  (settings, members, roles, plugins, organizations, god-mode) can import from
  `/client/ui` to drop the field registry from their initial load. Only the route
  that mounts `AdminApp`/`DocumentEditor` needs the full `/client`.

  ```diff
  -import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client';
  +import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client/ui';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f898e3e`](https://github.com/IcelandicIcecream/aphex/commit/f898e3e092a2d948a996dfe0e567aefcfb118719) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add schema lifecycle hooks and a typed `defineType` authoring helper.
  - `hooks.beforeValidate` on a schema — save-time transform functions that run on every write path (Local API `create`/`update`, HTTP API, admin UI) before field validation. Use them to normalize or derive input (trim, slugify, stamp, default). Hooks are transform-only by design: rejection and cross-field invariants stay in `validation: (Rule) => Rule.custom(...)`, and side effects belong in domain-event consumers — never in a hook.
  - `defineType(schema)` — an optional, backwards-compatible wrapper that captures the exact `fields` literal via a `const` type parameter, so `beforeValidate` hooks receive a `data` typed by self-reflection from the schema's own fields — no generated types, no casts. Plain `const x: SchemaType = { ... }` objects keep working unchanged.
  - Cross-field validation: `validateDocumentData` now populates `context.document` (the whole document) for `Rule.custom((value, { document }) => ...)`, matching the `ValidationContext` type. The document is built internally from the data being validated, so callers no longer pass it redundantly.

### Patch Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f798ed3`](https://github.com/IcelandicIcecream/aphex/commit/f798ed3975c0279eb5ee99ba0af6a4490f190c7d) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Lazy-load the rich-text (TipTap) editor. `ArrayField` now dynamically imports
  `RichtextField` only when a field's `of` actually contains `{ type: 'block' }`,
  so the ProseMirror/TipTap bundle (~393 kB min / 122 kB gzip) is split into its
  own async chunk instead of riding in the shared admin chunk.

  Effect: every admin page that doesn't render a rich-text editor — settings,
  members, roles, api-keys, and document editors whose schema has no block field —
  no longer downloads TipTap up front. It loads on demand the first time a
  rich-text field is shown. No API or behaviour change.

## 9.5.2

### Patch Changes

- [`2cc2657`](https://github.com/IcelandicIcecream/aphex/commit/2cc2657e9be58d5709166cc2e19ebd9a73382447) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix `generate:types` failing on plugins that import named icons

  The esbuild stub that strips `@lucide/svelte` out of the type-generation
  bundle was an ESM module exporting only a default. esbuild validates ESM named
  imports against the target module's exports, so any plugin doing
  `import { Sparkles } from '@lucide/svelte'` — which `@aphexcms/plugin-seo` does
  — failed the bundle with:

      No matching export in "lucide-stub:@lucide/svelte" for import "Sparkles"

  The stub (and the `.svelte` component stub, which has the same problem) now
  emits CommonJS. Named imports off a CJS module are resolved as property access
  rather than statically validated, so every icon name works and yields
  `undefined` — which is what the existing `icon:` rewrite wants anyway.

## 9.5.1

### Patch Changes

- [#273](https://github.com/IcelandicIcecream/aphex/pull/273) [`2b66bd4`](https://github.com/IcelandicIcecream/aphex/commit/2b66bd42126e1dc8894d68dae3d4bb353657ddaf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix broken build in consuming apps: `@aphexcms/cms-core` shipped `dist/mcp/tools.js` importing `../../cli/generate-types.js`, a path that escapes the `dist` tree and fails to resolve in any consuming app (`Could not resolve "../../cli/generate-types.js"`). The shared type-shape logic (`mapFieldTypeToTS`/`fieldWriteShape`, plus the `generateTypesFromConfig` wrapper) now lives in core at `src/lib/type-gen.ts`, so `lib` no longer reaches up into `src/cli`. The `aphex` CLI bin is unchanged and imports the logic from core.

## 9.5.0

### Minor Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin capabilities now reach owners, and settings honour their own gate

  Two gaps in how plugin-declared capabilities integrate with the role model.

  `owner` was seeded from `ALL_CAPABILITIES`, which is core-only, so an owner could not
  hold a capability declared by an installed plugin — leaving owner with strictly fewer
  permissions than an `admin`, who can be granted one through the roles UI. The engine
  now derives owner's set from the merged capability catalog (core built-ins plus every
  plugin-declared capability) and passes it to `seedBuiltinRoles`, which takes an
  optional `ownerCapabilities`. Because the boot reconcile re-seeds every org,
  installing or removing a plugin is enough to bring owners in line. New orgs seed the
  same way, so a freshly created org's owner isn't missing its plugins' capabilities
  until the next restart.

  `hasCapability` accepted only the closed core `Capability` union, so checking a
  plugin-declared capability didn't type-check. It now takes `Capability | (string &
{})`, keeping autocomplete for built-ins while admitting plugin ids.

  `SettingsPart.requiredCapabilities` was documented as a way to "gate a specific
  plugin's settings more tightly" but was read nowhere: every plugin's settings were
  reachable by anyone holding `plugin.settings.manage`. It is now enforced on both
  `GET /api/plugin-settings` (which filters declarations, so the admin panel hides what
  you can't manage) and `PUT /api/plugin-settings/:pluginId`. Reads were already masked,
  so the exposure this closes is write: overwriting the secrets of a plugin that asked
  for a narrower capability.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin system: declare schemas, routes, capabilities and admin UI from a package

  `definePlugin` plus a discriminated-union `PluginPart` and a part resolver let a
  package contribute to the CMS without the app wiring each piece by hand. Parts
  cover schemas and schema transforms, server routes, capabilities, document
  actions, admin tools, field components, and settings.

  Parts split across two planes: serializable parts the server engine ingests via
  `aphex.config.ts`, and component parts the admin imports directly (they can't
  cross a SvelteKit `load`). A Vite plugin handles auto-discovery.

  `aphex/server/route` parts must declare `requiredCapabilities` — there is no
  default, because none is right for both a webhook receiver and an admin-only
  export. `['forms.export']` requires authentication plus those capabilities, `[]`
  requires only authentication, and `'public'` opts out of the gate entirely. The
  CMS enforces this at mount, before the handler runs, so a plugin route is never
  accidentally open: omitting the field doesn't type-check, and exposing a route to
  the internet is a word you have to write.

  Also adds a theme module (`theme/`) exporting tokens, schemes and derivation, and
  an `AdminArea` type for extending the admin shell.

  This is additive — existing configs keep working without declaring any plugins.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Schema transforms no longer drop access control, validation, or groups

  `{ type: 'color' }` and `{ type: 'seo' }` are desugared into real object fields by a
  schema transform. Both transforms rebuilt the field from a hand-picked subset of its
  properties — `name`, `title`, `description`, `group` — which silently discarded
  everything else the author wrote. A field declared with `access` came out of the
  transform **unrestricted**; `validation` was dropped; and `group: ['design',
'general']` collapsed to just `'design'`.

  Adds `desugarFieldType` to cms-core, which owns the tree walk (nested objects, array
  members) and layers the authored field back over the built one, so preservation is
  the default rather than something each plugin re-implements and gets wrong. The
  builder declares only the shape it owns; `sugarKeys` names the properties that exist
  solely on the sugar type (color's `alpha`, which becomes `inputOptions.alpha`) so
  they don't survive onto the expanded field. A property added to `BaseField` later is
  carried through automatically.

  Both plugins now use it, which also removes the duplicated `groupOf`/`expandFields`/
  `expandMember` recursion from each of them.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Reconcile built-in roles on boot so `owner` picks up new capabilities

  Built-in roles were seeded once, at organization creation, with
  `onConflictDoNothing`. That is correct for creation but means an org seeded
  before a capability existed never learns about it: the row is already there, so
  the conflict clause skips it. Upgrading core silently left owners without newly
  added permissions — `plugin.settings.manage` was invisible to owners of existing
  orgs.

  `owner` is now treated as an invariant rather than a default floor. It is defined
  as the whole of `ALL_CAPABILITIES`, so `seedBuiltinRoles` reconciles it to that
  set, and `CMSEngine.initialize()` re-seeds every organization on boot.
  `admin`/`editor`/`viewer` are deliberately left untouched — they are editable, and
  force-adding a capability could re-widen access an operator narrowed on purpose.
  No role ever gains a permission automatically except `owner`, which by definition
  already holds every one.

  `PATCH /api/roles/owner` now rejects capability edits with a 403: the boot
  reconcile would revert them at the next restart, so accepting the write would be
  a lie. This mirrors the existing block on deleting built-in roles. Custom roles
  remain the way to grant narrower access.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Per-organization plugin settings, with encrypted secrets

  A plugin declares its settings shape via an `aphex/settings` part; core renders
  the form, stores values per organization, and injects them into the plugin's
  server code. Storage is a generic `cms_plugin_settings` table keyed by
  (organization, plugin) — adding a plugin never means a migration.

  Fields typed `'secret'` are encrypted at rest with AES-256-GCM under a versioned
  `v1:iv:tag:ciphertext` envelope, so the key can be rotated later without
  guessing at old values. Set `APHEX_SECRET_ENCRYPTION_KEY` to enable them; saving
  a secret without it fails loudly rather than writing plaintext.

  Secrets never reach the browser: the API serves masked values, and the decrypting
  accessor is server-only. Submitting a blank or masked field leaves the stored
  secret untouched, so a round-trip through the form can't wipe it.

  `SecretField` is deliberately not part of `FieldTypeMap` — `Field` derives from
  that map, so adding it there would let `'secret'` leak into content schemas.
  Settings are config, not content.

  `SettingsField` is a narrow subset — `string`, `text`, `number`, `boolean` and
  `secret` — rather than the whole content `Field` union: that's exactly what the
  panel renders and the service validates, so a declaration can't promise a widget
  (an `image`, a `reference`) that would fall through to a bare text input and store
  nonsense.

  Submitted values are validated against the declaration on save, so plugin server
  code can trust what it's injected instead of re-guarding every read. A `number`
  field rejects `"3"`, a `string` with a `list` rejects an undeclared option, and an
  invalid patch is refused whole with a 400 and its issues rather than being applied
  in part.

  Gated behind a new `plugin.settings.manage` capability.

### Patch Changes

- Updated dependencies [[`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/ui@0.8.3

## 9.4.0

### Minor Changes

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - `aphex migrate` now supports SQLite (libsql) as a third driver alongside Postgres and pglite. Detection: `APHEX_DATABASE=sqlite` or a `DATABASE_URL` starting with `file:`/`libsql:`. Remote (Turso) databases use `DATABASE_AUTH_TOKEN`.

### Patch Changes

- [#270](https://github.com/IcelandicIcecream/aphex/pull/270) [`53f3209`](https://github.com/IcelandicIcecream/aphex/commit/53f32098b7f837263ef92a61208511569ad39654) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Sanitize schema names with hyphens in GraphQL identifiers. A schema type named `blog-post` produced an invalid GraphQL identifier, since the spec only permits `[_A-Za-z][_0-9A-Za-z]*`. Type, field, union, and object names are now normalized through shared `toPascalCase` / `toCamelCase` helpers (`src/lib/utils/string-case.ts`), which handle hyphens, underscores, and camelCase boundaries consistently across the GraphQL schema builder, the resolvers, and `generate-types`.

  Thanks [@ChristopherSO](https://github.com/ChristopherSO) — [#267](https://github.com/IcelandicIcecream/aphex/pull/267).

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`21dc2dc`](https://github.com/IcelandicIcecream/aphex/commit/21dc2dcd2c706870615de4017476562a8f40ffef) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Silence a Vite SSR warning from `generate-types`. The CLI dynamically imports the consumer's schema module by a path resolved at runtime, which Vite cannot statically analyze — the import is now marked `/* @vite-ignore */`, so pulling this file into a dev bundle no longer logs "The above dynamic import cannot be analyzed by Vite."

## 9.3.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a built-in MCP server so coding agents (Claude Code, Cursor) can read and build content over an org-scoped API key. Ships with the package via a re-exportable SvelteKit route (`@aphexcms/cms-core/routes/mcp`) using the official `@modelcontextprotocol/sdk` over Streamable HTTP (`@hono/mcp`), plus a transport-agnostic tool registry (`buildContentTools`). Tools derive their schema/field-type knowledge from the real validators and run under the caller's RBAC + RLS scope. Also includes richtext/portable-text editor fixes.

## 9.2.2

### Patch Changes

- auto generate types via vite plugin & data normalization bug fix for richtext

## 9.2.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/ui@0.8.1

## 9.2.0

### Minor Changes

- allow multi-line code for richtext

## 9.1.0

### Minor Changes

- Add rich text block

## 9.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- [#243](https://github.com/IcelandicIcecream/aphex/pull/243) [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494) Thanks [@ChristopherSO](https://github.com/ChristopherSO)! - Fix the Vite dayjs ESM plugin alias on Windows by handling backslash-separated resolved paths.

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01)]:
  - @aphexcms/ui@0.8.0

## 8.1.0

### Minor Changes

- fixed reference and version ui bug

## 8.0.0

### Minor Changes

- better reference fields !

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.7.0

## 7.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.6.0

## 6.0.0

### Minor Changes

- FIXED UP MODAL SHITS>

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.5.0

## 5.1.0

### Minor Changes

- added a bunch of fixes

## 5.0.6

### Patch Changes

- Added vite plugin for HMR - upgradable

## 5.0.5

### Patch Changes

- add optimizations

## 5.0.4

### Patch Changes

- security and opptimization fixes

## 5.0.3

### Patch Changes

- Update to allow singleton support

## 5.0.2

### Patch Changes

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

## 5.0.1

### Patch Changes

- UPDATE SMALL BUGS AND FIXED TYPE GENN"

## 5.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.4.0

## 4.0.0

### Major Changes

- Fix up client exports

## 3.0.0

### Major Changes

- [`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - remove subpaths for .svelte

## 2.1.2

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/ui@0.3.4

## 2.1.1

### Patch Changes

- Add the `svelte` export condition to every subpath export (`./client`,
  `./server`, `./schema`, `./app-augment`, `./routes/*`, `./*`) so
  Vite/SvelteKit's Svelte plugin claims them and compiles the re-exported
  `.svelte` components. Without it, Node's plain ESM loader received raw
  `.svelte` files and threw `ERR_UNKNOWN_FILE_EXTENSION`.

## 2.1.0

### Minor Changes

- correct context.svelte export

## 2.0.12

### Patch Changes

- Fix ESM resolution for `schema-context.svelte` rune module (dist imports
  now emit `.svelte.js` extension).
- Confirm-dialog: use shadcn `<Button>` components and break long titles so
  long asset filenames no longer stretch the delete modal.
- DocumentEditor: vertically center the header top row (breadcrumb, auto-save,
  draft/published pills, ellipsis).
- DocumentEditor: autosave now compares against an initial-defaults snapshot,
  so unchecking a boolean triggers save and booleans with `initialValue: true`
  no longer auto-create the document on mount.

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/ui@0.3.3

## 2.0.10

### Patch Changes

- USE ZOD API. and couple of minor bug fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.2

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.1

## 2.0.8

### Patch Changes

- remove version restoration restriction

## 2.0.7

### Patch Changes

- hotfix. export document version panel

## 2.0.6

### Patch Changes

- added versioning

## 2.0.5

### Patch Changes

- cache key creation works on nested items

## 2.0.4

### Patch Changes

- add in memory caching

## 2.0.3

### Patch Changes

- Fix DocumentEditor overflow scroll bug and update apiKeyClient import for better-auth v1.5.x

## 2.0.2

### Patch Changes

- pluralize instead of just appending s

## 2.0.1

### Patch Changes

- template fixers

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.3.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.2.0
