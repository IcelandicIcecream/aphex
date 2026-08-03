---
'@aphexcms/ui': patch
---

Restore `cursor: pointer` on buttons in the admin.

Tailwind v4 removed `button { cursor: pointer }` from preflight, so every button that
didn't opt in explicitly reverted to the browser's default arrow. The result had drifted
badly across the admin — `MediaBrowser` had it on 0 of 21 buttons, `ArrayField` on 4 of 17,
`DocumentEditor` on 23 of 25 — so whether a control _looked_ clickable depended on which
file it happened to live in. Most visible in the rich text editor: block-level object cards
(callout, code block, custom types) are `<button>`s and lost the pointer, while the inline
chips and image blocks kept theirs because they set `cursor: pointer` in their own scoped
styles.

Fixed once in the shared stylesheet's base layer rather than adding `cursor-pointer` at
every call site. Disabled buttons and `aria-disabled` role-buttons keep the default cursor,
which is the correct affordance for something that can't be clicked.

Released as a patch for the same reason as 0.8.4: every core package peer-depends on
`@aphexcms/ui`, and changesets treats a peer-range change as breaking, so a minor would
cascade a major bump onto cms-core and every adapter. A patch stays inside the published
`^0.8.3` range, so existing installs pick it up on the next resolve.
