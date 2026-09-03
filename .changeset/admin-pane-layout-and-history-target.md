---
'@aphexcms/cms-core': patch
---

Admin panes size to the space they actually have, and the history panel follows the document you're editing.

## The version history panel showed the wrong document

`history=1` survives navigation, and the URL sync only opened the panel when it was
currently closed. Switching documents with history open therefore left
`versionPanelDocId` pointing at the _previous_ document: the version list belonged to one
document while the editor showed another, and Restore would have written to the document
you were no longer looking at. It now retargets on every navigation and drops any version
preview from the old document.

## Panes

The layout maths measured `window.innerWidth`, which counts the app sidebar — a pane the
editor never gets — and ignored the 280px history panel entirely. The available width was
overstated by roughly 540px, so the collapse logic concluded there was plenty of room and
never fired: opening history squeezed the editor to ~300px between two full-width lists
instead of collapsing them.

- Width is measured from the pane container and the history panel is subtracted, so the
  number the collapse logic sees is the number the editor actually gets.
- `MIN_EDITOR_WIDTH` is now what the editor _wants_, not a floor it must clear to be
  shown. Collapsing it to a 60px strip only makes sense if another pane claims the space;
  when nothing does, a narrow editor beats a strip beside an unused gap.
- Clicking a collapsed strip always takes effect. The panel the user just expanded is
  never the one collapsed to make room — doing so undid the click in the same derivation,
  which was indistinguishable from the click doing nothing.
- Focus and space priority are separate: a list panel holding focus no longer drops the
  open editor out of the expanded set.
- Both lists keep a fixed width and never flex. Only the editor absorbs leftover space —
  a list stretched across 700px is mostly whitespace.

Whenever a document is open the panes tile the container exactly. With nothing open the
lists sit at their natural width.

## Mobile

The history panel was a fixed 280px column with no small-screen handling, leaving ~95px
for the fields on a 375px viewport. Below 620px it is now a full-screen sheet.
