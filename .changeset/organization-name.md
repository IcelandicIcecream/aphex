---
'@aphexcms/cms-core': minor
---

An organization's name is cleaned when it's created or renamed through the API: one line, single spaces, trimmed, without invisible characters (zero-width spaces, direction overrides), and at most 200 characters. A name of only spaces is refused. `cleanOrganizationName` is exported for an app's own forms.

A new config hook, `checkOrganizationName`, lets the app refuse a name, like `checkOrganizationSlug` does for slugs: return a reason (the person sees it) or nothing. It gets the cleaned name, on create and on a rename that changes the name.

```ts
checkOrganizationName: (name) => (blocked(name) ? 'Choose another name.' : null);
```

The organization settings page now shows the API's reason when a save is refused, instead of only "Invalid slug".
