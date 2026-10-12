---
'@aphexcms/cms-core': patch
---

Fix "Unknown node type: portableTextObject" when inserting an image into a rich text field whose `of` has `block` + `image` but no other custom object types. Images are inserted as `portableTextObject` nodes, so the extension is now registered whenever the field offers images.
