---
'create-aphex': minor
---

`pnpm create aphex` run in an app that already uses Aphex now upgrades it to the embedded admin of `@aphexcms/cms-core` 12. It deletes the route files core now serves (the admin pages, sign-in and account pages, God Mode, `/api` and `/media`) and the helpers only they used, adds the `/admin/[...path]` route and `aphex.client.ts`, removes the invitation email hook so invitees don't get two emails, points `loginUrl` and password reset links at `/admin`, renames `locals.auth` to `locals.aphexAuth`, and moves the `@aphexcms/*` packages to the latest version. It deletes a file only when it's exactly a version the base or website template shipped, and keeps a route folder whole when any file in it was changed. For a kept folder it shows the lines that are yours, and asks whether to replace it with core's anyway. When the app patches an `@aphexcms` package, it names the patch and installs nothing, since the patch is pinned to the old version. `--dry-run` shows the plan without changing anything. The guide is at https://docs.getaphex.com/upgrading-to-embedded-admin.

Adding Aphex to an app (`init`) no longer declares `aphexCMS` or `aphexAuth` a second time in an `app.d.ts` that already has them, and adds `aphex()` to `vite.config.ts` without reformatting the rest of the file.
