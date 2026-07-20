---
'@aphexcms/cms-core': patch
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
'@aphexcms/storage-s3': patch
'@aphexcms/nodemailer-adapter': patch
'@aphexcms/resend-adapter': patch
'@aphexcms/ui': patch
'@aphexcms/visual-editing': patch
'@aphexcms/plugin-color-picker': patch
'@aphexcms/plugin-seo': patch
'@aphexcms/cli': patch
'create-aphex': patch
---

Ship `CHANGELOG.md` in the published npm tarball. Each package's `files` allowlist
previously excluded it (npm only force-includes `package.json`/`README`/`LICENSE`/`main`),
so the Changesets-generated changelog never reached npm. Adding `"CHANGELOG.md"` to `files`
makes it discoverable on npmjs.com and in `node_modules`.
