---
'create-aphex': patch
---

Republish the templates. No scaffolder change — `create-aphex` fetches the template at a tag cut from its own version, so a bump is what ships template fixes:

- A member's role can now be changed from Settings → Members (the endpoint and `member.changeRole` capability existed; nothing in the admin called them).
- The dev-mode email log probes `:1025` and says whether Mailpit is actually running instead of claiming it is unconditionally. The `.env.example` note that reset/invite links are printed to the console was wrong and has been corrected.
- Schemas are authored with `defineType()` so `hooks.beforeValidate` gets a `data` typed from the schema's own fields.
