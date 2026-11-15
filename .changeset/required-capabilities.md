---
'@aphexcms/cms-core': minor
---

Schema types can need a feature: `requiredCapabilities: ['site.shop']`. One deployment can then serve organizations with different content, such as a shop's products for one and a booking service's bookings for another.

- For an organization without the feature, a document type doesn't exist: the sidebar, type lists, reference pickers and MCP leave it out, and every operation on it is refused, whatever the role.
- An object type (a page block) can't be added: insert menus leave it out and a save that adds one is refused. Blocks a document already has are kept and save untouched, so losing a feature loses no content.
- `siteContext()` returns `capabilities()`, the features the site's organization has, since site reads aren't gated.
- A `requiredCapabilities` id that nothing declares stops the CMS at boot, naming the schema, rather than silently hiding the type from everyone.
