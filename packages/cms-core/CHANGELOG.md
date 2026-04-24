# @aphexcms/cms-core

## 2.1.0

### Minor Changes

- correct context.svelte export

## 2.0.12

### Patch Changes

- Fix ESM resolution for `schema-context.svelte` rune module (dist imports
  now emit `.svelte.js` extension).
- Confirm-dialog: use shadcn `<Button>` components and break long titles so
  long asset filenames no longer stretch the delete modal.
- DocumentEditor: vertically center the header top row (breadcrumb, auto-save,
  draft/published pills, ellipsis).
- DocumentEditor: autosave now compares against an initial-defaults snapshot,
  so unchecking a boolean triggers save and booleans with `initialValue: true`
  no longer auto-create the document on mount.

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/ui@0.3.3

## 2.0.10

### Patch Changes

- USE ZOD API. and couple of minor bug fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.2

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.1

## 2.0.8

### Patch Changes

- remove version restoration restriction

## 2.0.7

### Patch Changes

- hotfix. export document version panel

## 2.0.6

### Patch Changes

- added versioning

## 2.0.5

### Patch Changes

- cache key creation works on nested items

## 2.0.4

### Patch Changes

- add in memory caching

## 2.0.3

### Patch Changes

- Fix DocumentEditor overflow scroll bug and update apiKeyClient import for better-auth v1.5.x

## 2.0.2

### Patch Changes

- pluralize instead of just appending s

## 2.0.1

### Patch Changes

- template fixers

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.3.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.2.0
