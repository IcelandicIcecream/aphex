---
'@aphexcms/cms-core': minor
---

Fieldsets: titled, optionally folded sections of fields, on a document type, an object type or an object field (`fieldsets: [{ name, title, options: { collapsed: true } }]`, then `fieldset: 'name'` on each field). Layout only: data is stored as before. `columns` lays a section's fields side by side (one column on a phone). A folded section shows how many of its fields are set and flags a problem inside. Object fields can fold away too (`options: { collapsible, collapsed }`), and a field in an undeclared fieldset fails at boot.

Hidden fields no longer leave gaps in a document's form, and a field asking for an `input` no plugin registers logs a warning instead of silently showing the default control.
