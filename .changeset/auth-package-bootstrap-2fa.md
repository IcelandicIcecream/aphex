---
'@aphexcms/auth': minor
'@aphexcms/cms-core': patch
---

Add `@aphexcms/auth` — Better Auth instance, session/API-key service, `AuthProvider`, and the
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
