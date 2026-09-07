# @aphexcms/visual-editing

Click-to-edit visual editing for [AphexCMS](https://github.com/IcelandicIcecream/aphex).

Renders your real site in the studio's preview pane and makes the content in it clickable: an author clicks a heading on the page and lands on that field in the editor, with edits streaming back live.

📚 **Documentation: [docs.getaphex.com/visual-editing](https://docs.getaphex.com/visual-editing)**

## Install

```bash
pnpm add @aphexcms/visual-editing
```

## Setup is two things

**1. Wrap your public layout.** The overlay is a no-op unless the URL carries the `?aphex-preview` marker the editor's iframe adds, so it costs real visitors nothing:

```svelte title="src/routes/(site)/+layout.svelte"
<script lang="ts">
	import { AphexVisualOverlay } from '@aphexcms/visual-editing';
	let { children } = $props();
</script>

<AphexVisualOverlay>
	{@render children()}
</AphexVisualOverlay>
```

**2. Give the schema a `previewUrl`** so the CMS knows which route renders a document:

```ts
previewUrl: (doc) => (doc.slug ? `/blog/${doc.slug}?aphex-preview=1` : null);
```

That's the whole setup. Plain text fields become click-to-edit automatically — the CMS encodes them with invisible [stega](https://github.com/vercel/stega) markers, so the string carries its own field address.

## `usePreview()` — the one helper

Everything else is one call, once per component:

```svelte
<script lang="ts">
	import { usePreview } from '@aphexcms/visual-editing';
	const ve = usePreview();
	let { data } = $props();
	const page = $derived(ve.live(data.page));
</script>
```

| Method     | For                                                                    |
| ---------- | ---------------------------------------------------------------------- |
| `live()`   | Merge the editor's in-flight document over your `load` data            |
| `edit()`   | Mark an element as the target for a field — required for arrays/images |
| `image()`  | The same, for an image that has no string to carry a marker            |
| `encode()` | Add markers to a string you derived yourself                           |

## Four things that are easy to get wrong

Each produces breakage that only appears in preview, which is why they're worth reading before you debug one:

- **A repeated block must reveal its own row.** Spread `{...ve.edit({ field: 'layout', arrayIndex: index })}` onto its root element. Text is clickable on its own, but the surrounding chrome, buttons and empty states are inert without an explicit target — and a block that ignores its index sends the author to the top of the array instead of to their block.
- **Images always need `edit()`/`image()`.** A string can carry stega inside itself; an image has no string to carry.
- **`live()` merges, it doesn't replace.** It preserves underscore-prefixed keys (`_posts`, `_form`) that your `load` derived and the editor's document can't know about.
- **Clean any value you branch on.** A stega-marked `'center'` matches no `===`, and the branch silently takes the wrong arm. `stegaClean(value)` before comparing; leave display strings marked, because that's what makes them clickable.

A block that renders a _different_ document needs its own `live()`, gated on type and id — otherwise editing that document does nothing until a reload.

## License

MIT
