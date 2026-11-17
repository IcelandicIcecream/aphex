---
'@aphexcms/cms-core': minor
'@aphexcms/plugin-color-picker': minor
---

Inherited values: a field can declare `inherits: { from, value }`, what it is while empty. The admin shows that value in the empty control, marks a field set by hand with a reset icon (its tooltip names what it goes back to), offers "Reset all" on an object, and shows an Undo after every reset. Nothing is stored. Custom inputs receive the worked-out value as `inherited`; the colour picker shows it as a dashed swatch and starts from it. Fieldset columns now fit the width the form actually has, dropping to fewer columns in a narrow panel.
