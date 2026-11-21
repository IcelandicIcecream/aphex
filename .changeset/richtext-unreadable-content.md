---
'@aphexcms/cms-core': patch
---

A rich text field whose stored content its current settings can't show (a block type or mark that was removed, say) no longer opens empty. It used to, with only a console warning, and the first keystroke then autosaved the empty document over the real text (#334). The field now says the text can't be shown, and stays read-only until a readable value arrives, such as a restored version.
