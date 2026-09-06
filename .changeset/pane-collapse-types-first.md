---
'@aphexcms/cms-core': patch
---

Collapse the document-type list before the document list when panes run out of room

When space got tight the admin collapsed the docs list first and the type list last, on
the reasoning that panes are depth-ordered and the shallowest should yield last. That
reads the wrong signal: depth describes how you got to a document, not what you still
need now that you're there.

While editing, the type list is the pane you're least likely to want — you already know
what you're editing, and switching type is a rarer move than switching between documents
of the same type, which is the docs list's whole purpose. Keeping a list of types you
aren't using while collapsing the list of siblings you're moving between had it backwards.

The order is now types, then docs. Everything else about the behaviour is unchanged: an
open editor still never gives way, a pane the user explicitly expanded by clicking its
strip is still never collapsed in the same derivation, and both lists still collapse when
two editors are open.
