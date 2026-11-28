---
'@aphexcms/cms-core': minor
---

An object type can have an `initialValue`, like Sanity's: an object, or a function (sync or async) returning one. When the object is added to an array, it starts with each field's own initial value and then the type's on top, with a fresh `_key` on every item inside. A page builder's block can start filled in:

```ts
{
	type: 'faq',
	fields: [...],
	initialValue: {
		variant: 'beside',
		heading: 'Questions',
		items: [{ _type: 'faqItem', question: 'A question customers ask', answer: 'Your answer.' }]
	}
}
```

- A field's function `initialValue` now runs when an array item is added, instead of the item getting the field's empty default.
- A fixed `initialValue` is checked when the schema loads: a key that isn't one of the type's fields, or a value outside a field's `list`, is an error.
