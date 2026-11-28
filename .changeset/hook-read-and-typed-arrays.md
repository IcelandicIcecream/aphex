---
'@aphexcms/cms-core': minor
---

Schema hooks can read other documents, job handlers can use the Local API, and a hook's `data` types array and object fields.

- `beforeValidate` hooks get `read`, which finds, counts and gets documents in the writer's organization, as the writer: `await read.singleton('invoiceSettings')`, `await read.find('invoice', { where })`. It can't write, because a write elsewhere is a side effect and belongs in an event consumer. `read.singleton()` returns `null` for a singleton never saved, rather than creating it.
- Job handlers get `localAPI` and `emailAdapter`, so a scheduled job can create documents with their hooks and validation, and send email.
- With `defineType`, a hook's `data` now types array and object fields from their own fields, matching `aphex generate:types`: `data.lineItems?.[0]?.quantity` is a `number`, a reference array holds `{ _type, _ref, _key }`, and image and file fields are `ImageValue` and `FileValue`. These were `unknown` before, so a hook that narrowed them by hand can drop that code.

Write `hooks` after `fields` in `defineType`. TypeScript reads the properties in order, so with a field callback such as `validation` before them, hooks written first type `data` as every field type at once rather than each field's own.
