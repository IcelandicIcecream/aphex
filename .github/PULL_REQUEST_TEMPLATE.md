<!--
Conventional Commits for the PR title: feat: / fix: / docs: / refactor: / chore: / test:
-->

## What and why

<!-- What changes, and the problem it solves. Link the issue if there is one. -->

Closes #

## How to verify

<!-- The steps a reviewer takes to see it working, or the test that covers it. -->

## Checklist

- [ ] `pnpm lint && pnpm check && pnpm build` pass
- [ ] Tests pass for what I touched — and if this touches a database adapter, the
      cross-dialect conformance suite (`pnpm -F @aphexcms/sqlite-adapter test`) runs
      against both pglite and libsql
- [ ] Added a changeset (`pnpm changeset`) if this touches a published package — see
      [Changesets](https://docs.getaphex.com/contributing#changesets). A **template-only**
      fix still needs a `create-aphex` changeset to reach users
- [ ] Docs updated if behaviour or configuration changed
- [ ] If this changes `apps/studio`, I've considered whether it should flow to
      `templates/base` via `./scripts/sync-template.sh` and noted it in the template's
      `CHANGELOG.md`
