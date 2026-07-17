---
'@aphexcms/ui': patch
---

Add button-group, and rework the shared theme variables

New `button-group` component (`@aphexcms/ui/shadcn/button-group`) with separator
and text parts, plus a sidebar context helper.

`app.css` is reorganised around the theme tokens cms-core now derives from. No CSS
variable was removed, so overrides keep resolving.
