---
'@aphexcms/plugin-color-picker': minor
'@aphexcms/plugin-seo': minor
'@aphexcms/cms-core': minor
---

Schema transforms no longer drop access control, validation, or groups

`{ type: 'color' }` and `{ type: 'seo' }` are desugared into real object fields by a
schema transform. Both transforms rebuilt the field from a hand-picked subset of its
properties — `name`, `title`, `description`, `group` — which silently discarded
everything else the author wrote. A field declared with `access` came out of the
transform **unrestricted**; `validation` was dropped; and `group: ['design',
'general']` collapsed to just `'design'`.

Adds `desugarFieldType` to cms-core, which owns the tree walk (nested objects, array
members) and layers the authored field back over the built one, so preservation is
the default rather than something each plugin re-implements and gets wrong. The
builder declares only the shape it owns; `sugarKeys` names the properties that exist
solely on the sugar type (color's `alpha`, which becomes `inputOptions.alpha`) so
they don't survive onto the expanded field. A property added to `BaseField` later is
carried through automatically.

Both plugins now use it, which also removes the duplicated `groupOf`/`expandFields`/
`expandMember` recursion from each of them.
