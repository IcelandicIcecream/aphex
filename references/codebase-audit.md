# Codebase Audit Findings

> Audited: 2026-02-23
> Scope: `packages/cms-core`, `apps/studio`, `templates/playground`

---

## Critical

### 1. Sensitive Data in Logs (Security)
- **File:** `packages/cms-core/src/routes/api/auth/[...all]/handler.ts`
- **Issue:** Password reset tokens/URLs may be logged to console in development mode. These tokens allow account takeover if exposed.
- **Fix:** Remove or redact sensitive data from all log statements. Use a structured logger with configurable levels instead of `console.log`.

### 2. Unprotected Seed Endpoint
- **File:** `apps/studio/src/routes/api/seed/+server.ts`
- **Issue:** The seed endpoint can populate the database and is not gated behind authentication or an environment check. In production, this could be used to overwrite data.
- **Fix:** Gate behind `NODE_ENV === 'development'` check AND require authentication, or remove entirely from production builds.

---

## High

### 3. Excessive Console Logging (~50+ instances)
- **Files:** Throughout `packages/cms-core/src/` and `apps/studio/src/lib/server/`
- **Issue:** Dozens of `console.log` statements remain from development. These clutter server output, may expose internal state, and hurt performance in production.
- **Fix:** Replace with a proper logging utility that supports log levels (debug/info/warn/error). Strip debug logs in production builds.

### 4. Duplicate/Redundant Components
- **Files:**
  - `packages/cms-core/src/lib/components/admin/MediaBrowser.svelte` vs `EmbeddedMediaBrowser.svelte`
  - Multiple modal/dialog patterns used inconsistently
- **Issue:** Similar components exist with overlapping functionality, making maintenance harder and increasing bundle size.
- **Fix:** Consolidate into a single configurable component with props for different modes (embedded vs full-page, single vs multi-select).

### 5. Unused GraphQL Dependencies (Studio)
- **Files:** `apps/studio/package.json`
- **Issue:** GraphQL-related dependencies may remain in `package.json` even if the GraphQL plugin is optional. Increases install size unnecessarily.
- **Fix:** Move GraphQL deps to optional/peer dependencies or remove if the plugin handles its own deps.

### 6. Missing Error Boundaries in Admin UI
- **Files:** `packages/cms-core/src/lib/components/admin/`
- **Issue:** Several admin components lack error boundaries. A rendering error in one field can crash the entire document editor.
- **Fix:** Add `{#snippet}` error boundaries around field renderers and document sections.

---

## Medium

### 7. Missing Field Type Exports
- **File:** `packages/cms-core/src/index.ts` (and related barrel files)
- **Issue:** Some field-related types and utilities are not exported from the public API, forcing consumers to use deep imports or workarounds.
- **Fix:** Audit all public-facing types and ensure they're exported from the appropriate entry points (`@aphexcms/cms-core`, `@aphexcms/cms-core/server`, `@aphexcms/cms-core/schema`).

### 8. Dead/Stale Files
- **Files to investigate:**
  - Any remaining GraphQL-related files in templates that reference deleted modules
  - Empty or near-empty files that serve no purpose
  - Commented-out code blocks left from refactoring
- **Fix:** Delete dead files, remove commented-out code. If code might be needed later, it's in git history.

### 9. Stale TODOs
- **Files:** Throughout the codebase
- **Issue:** Multiple `TODO` comments exist, some dating back to early development. Many may no longer be relevant.
- **Fix:** Audit all TODOs. Convert actionable ones to GitHub issues. Remove stale/completed ones.

### 10. Inconsistent Error Handling Patterns
- **Files:** `packages/cms-core/src/routes/`, `apps/studio/src/routes/api/`
- **Issue:** Some API routes return `{ success: false, error: ... }` while others throw or return different shapes. No consistent error response format.
- **Fix:** Standardize on a single error response shape. Consider a shared `createErrorResponse(status, code, message)` utility.

### 11. Template Package Versions May Go Stale
- **Files:** `templates/playground/package.json`, `templates/basic/package.json`
- **Issue:** Template `package.json` files reference specific published versions (e.g., `^0.2.3`). When new versions are published, templates must be manually updated.
- **Fix:** Add a CI step or release script that bumps template dependency versions when packages are published.

### 12. AuthService Has Too Many Responsibilities
- **File:** `apps/studio/src/lib/server/auth/service.ts` (and `templates/playground` equivalent)
- **Issue:** `authService` handles sessions, API keys, user management, password resets, and organization logic all in one object. This makes it hard to test and maintain.
- **Fix:** Consider splitting into focused services: `SessionService`, `ApiKeyService`, `UserService`, `PasswordService`.

---

## Low

### 13. Potential Race Conditions in Auto-Save
- **Files:** `packages/cms-core/src/lib/components/admin/DocumentEditor.svelte`
- **Issue:** The 2-second auto-save debounce could cause race conditions if a user triggers a manual save while an auto-save is in flight.
- **Fix:** Add a save queue or mutex to prevent concurrent save operations. Cancel pending auto-saves when manual save is triggered.

### 14. Confusing Re-exports
- **Files:** `packages/cms-core/src/routes-exports.ts`, various barrel files
- **Issue:** Some modules are re-exported through multiple paths, making it unclear which import path is canonical.
- **Fix:** Document the canonical import paths. Consider deprecation warnings for non-canonical paths.

### 15. Empty/Placeholder Files
- **Files:** Various across the monorepo
- **Issue:** Some files exist as placeholders or stubs with minimal content.
- **Fix:** Either implement the intended functionality or remove the files.

### 16. Type Safety Gaps in Plugin System
- **Files:** `packages/cms-core/src/plugins/`
- **Issue:** Plugin configuration types use broad types (`any`, `Record<string, unknown>`) in some places, reducing type safety for plugin authors.
- **Fix:** Improve plugin type definitions with generics so plugin authors get better IDE support.

### 17. No Request Rate Limiting
- **Files:** API routes in general
- **Issue:** No rate limiting on auth endpoints (login, password reset) or API endpoints.
- **Fix:** Add rate limiting middleware, at minimum for auth-related endpoints. Can use SvelteKit hooks for this.

---

## Checklist

- [ ] **Critical #1:** Remove sensitive data from logs
- [ ] **Critical #2:** Protect seed endpoint
- [ ] **High #3:** Replace console.log with proper logger
- [ ] **High #4:** Consolidate duplicate components
- [ ] **High #5:** Clean up unused GraphQL deps
- [ ] **High #6:** Add error boundaries to admin UI
- [ ] **Medium #7:** Export missing field types
- [ ] **Medium #8:** Delete dead/stale files
- [ ] **Medium #9:** Audit and resolve TODOs
- [ ] **Medium #10:** Standardize error responses
- [ ] **Medium #11:** Automate template version bumps
- [ ] **Medium #12:** Split AuthService
- [ ] **Low #13:** Fix auto-save race conditions
- [ ] **Low #14:** Clarify re-export paths
- [ ] **Low #15:** Remove empty placeholder files
- [ ] **Low #16:** Improve plugin type safety
- [ ] **Low #17:** Add rate limiting
