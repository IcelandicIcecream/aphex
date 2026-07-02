# @aphexcms/postgresql-adapter

## 15.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@10.0.0

## 14.1.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add PGlite corruption guards. New `createPgliteClient(dataDir?)` export returns an HMR-safe singleton (one instance per data dir per process, cached on `globalThis`) and registers a graceful-shutdown hook (`beforeExit`/`SIGINT`/`SIGTERM`) that closes PGlite cleanly. This prevents the double-open and mid-write corruption that PGlite (which lacks Postgres's WAL crash recovery) is prone to during dev HMR and process exits. `createPgliteProvider` uses the guarded client automatically when no `client` is supplied.

### Patch Changes

- Updated dependencies [[`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7)]:
  - @aphexcms/cms-core@9.3.0

## 14.0.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.1

## 14.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.0

## 13.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.1.0

## 12.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01), [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494)]:
  - @aphexcms/cms-core@9.0.0

## 11.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.1.0

## 10.0.0

### Minor Changes

- better reference fields !

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.0.0

## 9.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@7.0.0

## 8.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@6.0.0

## 7.0.0

### Minor Changes

- added a bunch of fixes

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.1.0

## 6.0.6

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.6

## 6.0.5

### Patch Changes

- add optimizations

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.5

## 6.0.4

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.4

## 6.0.3

### Patch Changes

- Update to allow singleton support

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.3

## 6.0.2

### Patch Changes

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.2

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.1

## 6.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.0

## 5.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [[`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253)]:
  - @aphexcms/cms-core@3.0.0

## 3.0.1

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.2

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.0

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.11

## 2.0.10

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.10

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.9

## 2.0.8

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.8

## 2.0.7

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.7

## 2.0.6

### Patch Changes

- added versioning

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.6

## 2.0.5

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.5

## 2.0.4

### Patch Changes

- add in memory caching

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.1

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@1.0.0
