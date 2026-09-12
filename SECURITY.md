# Security Policy

## Reporting a vulnerability

**Please don't open a public issue.** Report privately through GitHub's
[Report a vulnerability](https://github.com/IcelandicIcecream/aphex/security/advisories/new)
form, which creates a private advisory only the maintainers can see.

If that isn't available to you, email **admin@thecoderunners.com**.

Helpful to include, to whatever extent you have it:

- What an attacker gains — read another organization's content, escalate a role, run code.
- Affected package and version (`@aphexcms/cms-core@x.y.z`), and the database adapter,
  since Postgres and SQLite enforce isolation differently.
- Reproduction steps, or a failing test.

### What to expect

Aphex is maintained part-time, so rather than quote a response time it can't keep, here
is the honest version: reports are read, and a genuine vulnerability gets prioritised
over everything else in the queue — but an acknowledgement may take a week or two, and a
fix takes as long as it takes. If you haven't heard anything and it's getting awkward,
send a nudge; it will have been missed, not ignored.

Coordinated disclosure is appreciated and reciprocated. If you'd like to publish, say so
and we'll agree a date rather than have one imposed either way. You'll be credited in the
advisory unless you'd rather not be.

## Supported versions

Fixes land on the **latest minor** of each published `@aphexcms/*` package. There are no
long-term support branches — Aphex is pre-1.0 and moving quickly, so the answer to "am I
patched" is "am I on the current minor."

## Scope

**In scope** — the published packages and the templates: cross-organization data leaks,
authentication and session handling, row-level security bypass, access-control rules that
don't hold, unauthenticated access to admin or internal endpoints, asset-URL signing
bypass, plugin secret handling, SSRF, injection, RCE.

**Out of scope:**

- **`getaphex.com/admin` is a public demo.** Anyone can sign up. Content there being
  editable is the demo working, not a vulnerability.
- Findings that require an account you already legitimately hold at a role that grants
  the action.
- Missing hardening headers, TLS configuration, or scanner output with no demonstrated
  impact.
- Vulnerabilities in a dependency with no path to exploit through Aphex — report those
  upstream.
- Social engineering, physical access, denial of service by volume.

Please don't run automated scanners against the hosted demo, and don't access, modify or
retain data belonging to anyone else — a proof of concept against your own account or a
local instance is enough.

## Things that behave defensively by design

Worth knowing before reporting, since each looks like a bug from the outside:

- **`POST /api/internal/workers/run` returns 404 while `APHEX_WORKER_SECRET` is unset.**
  The endpoint doesn't exist until a secret does, so it is never an unauthenticated
  surface.
- **Asset URL signing fails closed.** With `APHEX_ASSET_SIGNING_SECRET` unset, signing is
  a no-op and verification always fails — private assets stay session-only.
- **The container refuses to boot without `AUTH_SECRET`**, rather than coming up reachable
  with unsigned session cookies.
- **A field's `hidden` predicate is editor experience, not access control.** The value
  stays in the document, in API responses, and is writable through the API. Field-level
  `access` is the control. This is
  [documented](https://docs.getaphex.com/schemas/conditional-fields) — a hidden field being
  readable over the API isn't a finding.

## Operator responsibilities

Aphex is self-hosted, so some of the security boundary is yours:

- **`AUTH_SECRET`, `APHEX_SECRET_ENCRYPTION_KEY`, `APHEX_ASSET_SIGNING_SECRET`** — generate
  once, store in a password manager. Rotating `AUTH_SECRET` signs everyone out and
  invalidates every API key.
- **The first account to sign up becomes super admin.** On a public URL, set
  `APHEX_BOOTSTRAP_EMAIL` and `AUTH_INVITE_ONLY=true` before you share the link, rather
  than racing whoever finds `/login` first.
- **Never point `db:push` at a production Postgres database** — it can drop columns
  silently. Generate, review and commit a migration.
