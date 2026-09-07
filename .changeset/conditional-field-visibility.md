---
'@aphexcms/cms-core': minor
---

Add conditional field visibility (`hidden`)

A schema routinely has fields that only apply to one branch of a choice: a link's
target document when the link is internal, a hero's media when the hero is text
only, a form's redirect URL when it redirects. Until now they all stayed on screen,
so an editor read a form full of controls that do nothing and had no way to tell
which ones those were.

Any field may now declare a predicate:

```ts
{
  name: 'reference', type: 'reference', to: [{ type: 'page' }],
  hidden: ({ siblingData }) => siblingData.linkType !== 'reference'
}
```

It receives `{ siblingData, documentData }`. Reach for `siblingData` — it is the
object the field belongs to (the array item, the inline object, or the document at
the top level), and inside a repeated array item that distinction is the whole
point: three link rows each have their own `linkType`, and resolving against the
document would make all three follow the first.

**A hidden field is skipped by validation as well as by the renderer.** Otherwise a
required field on the inactive branch blocks the save with an error pointing at a
control nobody can see, which is unfixable from the UI. Both paths call the same
`isFieldVisible()` from `schema-utils` — deliberately one implementation, because
two would drift into exactly that failure.

The stored value is **kept**, not cleared, so toggling a choice twice isn't
destructive and switching back restores what was typed. A condition that throws
resolves to _visible_: a broken predicate should surface as a field that shouldn't
be there, never as one that silently vanished along with its content.

**`hidden` is not access control.** The value stays in the document, in API
responses, and writable through the API. Use `access` on the field for that.
