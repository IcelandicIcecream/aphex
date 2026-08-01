---
'@aphexcms/cms-core': patch
---

Fix a missing authorization check on the MCP `list_assets`/`upload_asset` tools — unlike every other document tool (which run through `CollectionAPI`, permission-checked transitively), these two called `assetService.findAssets`/`uploadAsset` directly with no capability check, so an API key without `asset.read`/`asset.upload` could still list or upload assets via MCP. Both tools now require the matching capability, returning a forbidden error otherwise — same as the HTTP asset routes.
