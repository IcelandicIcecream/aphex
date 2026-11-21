---
'@aphexcms/cms-core': patch
---

While the preview has the screen, the document type in the top bar is a "← Page" button: it closes the preview and shows the list again. Before, only the pressed Preview button did, which nobody guessed. The next document opened still opens with the preview (`openPreview`).
