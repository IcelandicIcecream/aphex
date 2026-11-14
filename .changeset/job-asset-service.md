---
'@aphexcms/cms-core': minor
---

Job handlers receive `assetService` (`injectAssetUrls`), so a job that renders a document's images, such as an email with a logo, can give them their URLs.
