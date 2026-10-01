---
'@aphexcms/cms-core': minor
'@aphexcms/nodemailer-adapter': minor
---

Add optional `cid` and `contentType` to an email attachment, and forward them from the nodemailer adapter. Without `cid`, an attachment referenced inline as `<img src="cid:...">` had no way to tell nodemailer which attachment to bind to that reference, so it always arrived as a broken image. The Resend adapter already passes `attachments` through to the Resend SDK unchanged; it uses `content_id` rather than `cid` for the same purpose, so it needs its own mapping if it is to support this too.
