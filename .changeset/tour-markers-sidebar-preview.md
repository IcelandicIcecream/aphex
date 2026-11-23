---
'@aphexcms/cms-core': patch
---

The sidebar stays open with the preview if you opened it there last time, and closing the preview puts it back as it was. Sidebar links, tools, the preview and Publish carry `data-tour` names (`type:<name>`, `tool:<id>`, `group:<id>`, `preview`, `publish`) for a guided tour to point at.
