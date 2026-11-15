---
'@aphexcms/cms-core': minor
---

Version history goes through the collection: `collection.listVersions`, `getVersion` and `restoreVersion`. Listing or reading a version now needs read access to the document, including the organization's features (`requiredCapabilities`), and leaves out fields the caller can't read. A restore is an ordinary draft save, so it refreshes the reference, asset and search indexes, runs hooks, and publishes on `liveEdit` schemas; the version replaces the draft rather than merging into it. `VersionService.restoreVersion` is removed: call `localAPI.collections.<type>.restoreVersion(context, id, versionNumber, { expectedRevision })` instead.
