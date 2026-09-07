---
'@aphexcms/nodemailer-adapter': patch
'@aphexcms/storage-s3': patch
'@aphexcms/ai-openai': patch
'@aphexcms/auth': patch
'@aphexcms/ui': patch
---

Add a README to each package, so npm has something to show

These five shipped with a blank package page. npm only re-renders a README when the
package republishes, so the file existing in the repo does nothing on its own — it
needs a version bump to travel.
