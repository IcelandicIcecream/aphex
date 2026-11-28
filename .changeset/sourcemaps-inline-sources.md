---
'@aphexcms/plugin-forms': patch
'@aphexcms/auth': patch
'@aphexcms/postgresql-adapter': patch
'@aphexcms/ai-anthropic': patch
'@aphexcms/nodemailer-adapter': patch
'@aphexcms/resend-adapter': patch
'@aphexcms/storage-s3': patch
---

Sourcemaps carry their source. Packages publish only `dist/`, so maps that pointed at `../src` named files nobody has, and Vite warned "points to missing source files" on every dev start. Debugging now shows the original TypeScript.
