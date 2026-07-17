# @aphexcms/plugin-color-picker

## 0.1.0

### Minor Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Schema transforms no longer drop access control, validation, or groups

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

### Patch Changes

- Updated dependencies [[`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/cms-core@9.5.0
  - @aphexcms/ui@0.8.3
