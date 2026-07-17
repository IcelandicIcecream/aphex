# @aphexcms/ui

## 0.8.3

### Patch Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add button-group, and rework the shared theme variables

  New `button-group` component (`@aphexcms/ui/shadcn/button-group`) with separator
  and text parts, plus a sidebar context helper.

  `app.css` is reorganised around the theme tokens cms-core now derives from. No CSS
  variable was removed, so overrides keep resolving.

## 0.8.2

### Patch Changes

- [#264](https://github.com/IcelandicIcecream/aphex/pull/264) [`4470eac`](https://github.com/IcelandicIcecream/aphex/commit/4470eacd5ec5116763b2c085b59f3e607d7b993a) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add slider component export (`@aphexcms/ui/shadcn/slider`). Required by @aphexcms/cms-core >= 9.3.0, whose NumberField imports it — 9.3.0 was published against a ui version that never shipped this export, breaking consumers with `Missing "./shadcn/slider" specifier`.

## 0.8.1

### Patch Changes

- add visual editing

## 0.8.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

## 0.7.0

### Minor Changes

- better reference fields !

## 0.6.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

## 0.5.0

### Minor Changes

- FIXED UP MODAL SHITS>

## 0.4.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

## 0.3.4

### Patch Changes

- fix weird import error
- Remove `src/app.aphex.css` (the `@aphexcms/ui/themes/aphex` theme). Apps
  that previously did `@import '@aphexcms/ui/themes/aphex'` in their own
  `app.css` should drop that line — the theme file no longer ships.

## 0.3.3

### Patch Changes

- UI Revamp + Flexible Schema

## 0.3.2

### Patch Changes

- USE ZOD API. and couple of minor bug fixes

## 0.3.1

### Patch Changes

- hmr fixes and ui fixes

## 0.3.0

### Minor Changes

- add github repo and publishConfig"

## 0.2.0

### Minor Changes

- Initial Changeset tracking
