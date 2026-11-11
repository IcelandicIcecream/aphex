---
'@aphexcms/cms-core': minor
---

A plugin's document action can go in the editor's ⋯ menu instead of its toolbar, with `placement: 'menu'`, and the toolbar wraps rather than running off the screen.

- An action in the menu stays mounted while the menu is closed, so a dialog it opens isn't lost when the menu closes. A click on a row closes the menu.
- Every action component now gets `action.placement` (`'toolbar'` or `'menu'`), so it can draw a compact button or a full-width row.
- The built-in "History" row in that menu is now "Version history", to tell it apart from a plugin's own history.
- The studio's sidebar lists document types, and their groups, in the order the app declares them in `schemaTypes`, rather than the order the server returns them.
- Sidebar groups get more space above their headings, and the first sits clear of the "Content" title.
