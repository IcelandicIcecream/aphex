---
'@aphexcms/cms-core': minor
---

Give the admin sidebar a user-defined hierarchy, and stop links that leave the studio
from navigating the admin away.

`SidebarData.navGroups` lets an app define any number of labelled sidebar groups, in
any order — `{ id?, label?, items?, placement? }`, where `placement: 'bottom'` pins a
group to the bottom of the sidebar and demotes it a size (the utility tier, for links
off-site, help, version). Most apps want the same three tiers, so three shorthand
fields desugar into them: `navItems` (the content nav), `systemNavItems` (operational
views like Activity), and `secondaryNavItems` (the bottom tier). All four fields are
additive — an app that only sets `navItems` renders as before, now under an explicit
"Content" heading rather than a default label that no longer described what the group
held.

Plugin admin tools can be filed into those groups. `AdminToolPart` gains
`group?: string`, naming a `SidebarNavGroup` by id; a tool that names nothing, or
names a group the host app hasn't defined, still renders in the default "Tools" group,
so a plugin never disappears because a host renamed a heading.

`SidebarNavItem` also gains `newTab?: boolean`, for items that leave the studio. A
`newTab` item opens in its own tab and is never marked active, so an editor keeps the
document they were working on. The starter templates use it for a "View site" item —
previously a "Home" button that replaced the admin with the public site in the same
tab. "Home" now names the `/admin` root, where it stays inside the studio.

Sidebar nav items render as real anchors instead of buttons calling `goto()`, so
cmd-click, middle-click, and "copy link address" behave the way they do everywhere
else. Active-state matching is judged across all groups, so a nested item like
`/admin/activity` no longer lights up its parent as well.

Internally, `NavMain` and `NavSecondary` are replaced by a single `NavGroup` renderer.
Neither was exported, so this is not a public API change.
