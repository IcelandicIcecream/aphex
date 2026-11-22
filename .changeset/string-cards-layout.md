---
'@aphexcms/cms-core': minor
---

A string field's list can render as cards: `options: { layout: 'cards' }` shows each option's `icon` drawn large, as a picture of the choice, over its title. For choices people recognise by looking, like a block's layouts. An option's `icon` now takes any component with a `class` prop (`ListOptionIcon`), not only a Lucide icon, so a drawing of a layout can be the picture.
