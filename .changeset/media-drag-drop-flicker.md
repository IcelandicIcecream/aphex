---
'@aphexcms/cms-core': patch
---

Drag-and-drop upload no longer flickers.

Two causes, compounding.

`dragleave` fires whenever the pointer crosses onto a **child** element, not only when it
leaves the region — and the media grid is nothing but children. Toggling a boolean on
enter/leave switched the overlay off every time the cursor moved between tiles, and the next
`dragover` switched it back on. Enter/leave now increment and decrement a counter, which
reaches zero only when the drag has genuinely left.

The counter alone wouldn't have fixed it, because the overlay was itself a drop target. It
renders directly under the cursor mid-drag, so the moment it appeared it took the drag, firing
a real `dragleave` on the region — which hid the overlay, putting the cursor back over the
grid, which showed it again. A feedback loop running at pointer-move rate. The overlay is now
`pointer-events: none`.

Also fixed while in here:

- **Non-file drags are ignored.** Dragging a text selection or one of the grid's own tiles used
  to raise "Drop files to upload" over the page for a drop that could produce nothing.
- **A drag that ends outside the window no longer strands the overlay.** Dropping on the
  desktop or cancelling with Escape delivers no `dragleave`, so the highlight stayed until the
  next drag.
- An empty drop no longer opens the upload dialog on an empty queue.

The upload dialog's own drop zone had the same handlers and gets the same fix.
