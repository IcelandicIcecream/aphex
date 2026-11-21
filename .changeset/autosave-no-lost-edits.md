---
'@aphexcms/cms-core': minor
---

Autosave no longer loses edits, and says what's happening:

- What counts as saved is what was sent, so typing during a slow save is saved next rather than marked saved.
- Leaving a document saves it first: opening another one, closing the editor, or closing the tab (sent with `keepalive`, with the browser's "Leave site?" while a save is pending).
- A save that returns after the editor moved on no longer writes into the document now open, and a first save no longer pulls the editor back to the document it created.
- Leaving a new, unsaved document for another one is treated as a switch, so its pending autosave can't land on the document opened.
- A conflict (someone else saved first) stops autosave and shows "Changed elsewhere" with Reload, once, instead of a toast on every pause. A save with no answer (offline, a 5xx) shows "Not saved · retrying" and is retried with a back-off; a refused save waits for the next edit.
- A stale revision now reaches the client as 409 even when an app loads cms-core twice (an adapter's `RevisionConflictError` is recognised by name, via `isRevisionConflictError`); it used to surface as a 500.
- Autosave waits 0.8 s after typing stops (was 1.2 s), and typing that never pauses is still saved at most 4 s after its oldest edit; a plain debounce never saved it. A new document is first saved 0.3 s after the first edit.
- Dialogs show "Changed elsewhere" and "Not saved · retrying" too, not "Auto-saved" while the document behind them can't save.
- The document list refreshes in place instead of flashing its loading skeleton on every save, and shows a "New … · Not saved yet" row while a document is being made.
- `documents.create`/`updateById` and `apiClient.post`/`put` take `{ keepalive }`.
- A confirmation dialog no longer opens twice: with more than one `ConfirmDialogHost` mounted (AphexStudio and AdminApp each mount one), only the first draws it.
