---
'create-aphex': patch
---

Generate a working `AUTH_SECRET`, and keep scaffolded projects private

Two things made a freshly scaffolded project fail on the first command anyone runs.

`.env` was a straight copy of `.env.example`, which ships the session-signing secret
deliberately unusable — empty in current templates, and a
`your-secret-key-here-change-in-production` placeholder in older published ones. So the
first `pnpm dev` after scaffolding stopped on a missing secret. The scaffolder now
generates one (32 random bytes, base64url) into whichever key the fetched template uses,
`AUTH_SECRET` or the legacy `BETTER_AUTH_SECRET`, and leaves any value that is already
set alone.

`delete packageJson.private` also removed `private: true` from the generated app. A
scaffolded project is an application, not a package to publish, and without the flag a
stray `npm publish` in the project root is accepted rather than refused. It now stays.

Both are covered by `tests/env.test.mjs`, and the package gained a `test` script — the
existing argument-parsing tests had no way to run, so CI's "Test scaffolder" step was
invoking a script that didn't exist.
