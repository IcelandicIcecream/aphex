---
'@aphexcms/cms-core': minor
'@aphexcms/visual-editing': minor
---

Click-to-edit reaches anything nested, and stops breaking values it marks.

A click in the preview now follows its path all the way down. Text in a page builder's third block, inside a column, inside a box, opens each of those in turn and focuses the field, where it used to open the block and stop. A click that arrives while modals are open closes them first, so a revealed row is no longer hidden behind an earlier one.

`ve.edit()` takes an `objectPath` (`[2].image`, `[2].columns[0]`), for what has no text to carry a path: an image, a button, a card's padding. The hover label names the field the path ends on rather than the top-level array.

Strings with a `list` are no longer marked. A renderer compares them (`variant === 'split'`), and a marked value matched nothing, so every such branch took the wrong arm in preview only. A field can opt out with `stega: false`, which also covers everything inside an object or array: colours, URLs, CSS, anchor ids. Rich text nested in an object now carries the path to its body.
