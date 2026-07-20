---
'@aphexcms/cms-core': patch
---

Scheduling refinements. The schedule button now mirrors the Publish button's
state (disabled when there are no unpublished changes), and a manual
publish/unpublish cancels any pending **same-direction** scheduled job — so the
queue can't fire a late duplicate and re-emit `document.published` /
`document.unpublished`. An opposite-direction schedule is left intact.
