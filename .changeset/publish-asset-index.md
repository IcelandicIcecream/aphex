---
'@aphexcms/cms-core': patch
---

Publishing updates the record of which assets a live page uses. Only draft saves refreshed it, so after a publish it went on naming the assets of the version the publish replaced, until the next save: an image swapped out by the publish still counted as in use, and the "Unused" filter never offered it. Every publish path now re-indexes in the publish's own transaction: `publish()`, save-and-publish, and scheduled publishes.
