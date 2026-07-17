# @aphexcms/plugin-seo

SEO & social meta for AphexCMS — a reusable meta field group, length-metered
inputs, a live Google-style search preview, one-click auto-generation, and an
audit tool. Feature-comparable to `@payloadcms/plugin-seo`. SEO is a plugin, not a
built-in: the engine ships the primitives, SEO composes on top of them.

## Install

```bash
pnpm add @aphexcms/plugin-seo
```

Register it once in your client-safe plugin registry (`src/lib/plugins.ts`):

```ts
import { seoPlugin } from '@aphexcms/plugin-seo';

export const plugins = [
	seoPlugin({
		collections: ['blog_post', 'author'] // auto-enable SEO on these document types
	})
];
```

Because this plugin contributes an `aphex/schema/transform` part (when
`collections` is set), it must be registered on **both** planes — the client
registry above **and** `aphex.config.ts`, which both import `src/lib/plugins.ts`.
See the [Plugins guide](https://aphexcms.com/docs/plugins) for the two-plane rule.

## What you get

Registering the plugin adds, per configured collection:

- A **SEO & Social** field group (`metaTitle`, `metaDescription`, `ogImage`,
  `noIndex`) injected into the document — no hand-editing schemas.
- **Length-metered inputs** on the title/description (the `seo-length` widget)
  that flag when you run past the ~60/~155 character sweet spots.
- A **live search preview** (the `seo-preview` widget) — a Google-style result
  card that updates as you type.
- A **✨ Generate SEO** document action that auto-fills meta from the document.
- An **SEO** admin tool (audit) that scores documents on title, description, and
  social image.

## Enabling SEO on a document

The normal path is `collections` — the plugin injects the field group for you and
is idempotent (a schema that already has a `seo` field is left untouched):

```ts
seoPlugin({ collections: ['blog_post', 'author', 'tag'] });
```

By default the fields go in a `seo` group (rendered as an **SEO** tab). Change it:

```ts
seoPlugin({ collections: ['blog_post'], group: 'metadata' });
```

### The `type: 'seo'` literal

To place SEO explicitly — e.g. to control field ordering — write the literal. No
import: registering the plugin augments core's `FieldTypeMap`, so `{ type: 'seo' }`
is fully type-safe (autocomplete, typos caught), and the plugin's schema-transform
desugars it into the `seo` object before the engine and codegen see it.

```ts
// in a document schema's fields:
{ name: 'seo', type: 'seo', title: 'SEO & Social', group: 'metadata' }
```

Like `type: 'color'`, this is sugar over a built-in `object` — the stored data is
portable and interpretable by core even if the plugin is removed. It generates a
fully-typed nested interface in `generated-types.ts` (not `unknown`), provided the
type generator runs your plugins (see [Type generation](#type-generation)).

### The `seoField()` builder

Equivalent to `type: 'seo'`, for when you'd rather import a builder than rely on
the ambient type. Import from the server-safe `/schema` entry:

```ts
import { seoField } from '@aphexcms/plugin-seo/schema';

// in a document schema's fields:
seoField('seo'); // pass a group name, or omit for none
```

`injectSeoField(schema, group?)` is the same transform the plugin applies — useful
if you compose your own schema pipeline:

```ts
import { injectSeoField } from '@aphexcms/plugin-seo/schema';

const withSeo = injectSeoField(blogPostSchema, 'seo');
```

## Auto-generation

The **✨ Generate SEO** action and the audit tool derive meta from a document via
four generators. The defaults are **schema-aware** — they read each type's own
`preview` config plus conventional field names (`title`/`excerpt`/`coverImage`,
etc.), so a blog post, an author, and a tag all resolve correctly with zero config.

Override any of them at registration to change how meta is derived:

```ts
seoPlugin({
	collections: ['blog_post', 'author'],
	generateTitle: (doc, { typeName }) => (typeName === 'author' ? `${doc.name} — Staff` : doc.title),
	generateDescription: (doc) => doc.excerpt ?? '',
	generateURL: (doc, { typeName }) =>
		typeName === 'author' ? `/authors/${doc.slug}` : `/blog/${doc.slug}`,
	generateImage: (doc) => doc.coverImage
});
```

Each generator receives the document **and** a `SeoGenContext` (`{ schema, typeName }`),
so one function can serve many collections.

| Generator             | Signature               | Default                                                |
| --------------------- | ----------------------- | ------------------------------------------------------ |
| `generateTitle`       | `(doc, ctx) => string`  | Preview title → `title`/`heading`/`name`/`label`       |
| `generateDescription` | `(doc, ctx) => string`  | `excerpt`/`description`/`summary`/… → preview subtitle |
| `generateURL`         | `(doc, ctx) => string`  | `/${doc.slug}`                                         |
| `generateImage?`      | `(doc, ctx) => unknown` | none (falls back to cover image)                       |

## Stored shape

The `seo` field is a plain `object` — portable, interpretable by core even if the
plugin is removed. Everything is optional; the frontend falls back to the
document's own title / excerpt / cover image.

```json
{
	"metaTitle": "How we cut build times in half",
	"metaDescription": "A walkthrough of the caching changes that…",
	"ogImage": { "asset": { "…": "…" } },
	"noIndex": false
}
```

## Reading it on the frontend

Resolve meta with the same precedence the plugin uses — explicit override first,
then a sensible fallback:

```svelte
<script lang="ts">
	let { doc } = $props();
	const title = doc.seo?.metaTitle ?? doc.title;
	const description = doc.seo?.metaDescription ?? doc.excerpt;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if doc.seo?.noIndex}<meta name="robots" content="noindex" />{/if}
</svelte:head>
```

The plugin reuses this same precedence internally (schema-aware `resolveTitle` /
`resolveDescription` / `hasSocialImage` fallbacks) to power auto-generation and the
audit tool.

## Type generation

The `{ type: 'seo' }` literal (and the `collections` injection) only desugars into
its object shape during codegen if the type generator is told about your plugins.
Pass your plugin registry as the third argument:

```jsonc
// package.json
"generate:types": "aphex generate:types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts ./src/lib/plugins.ts"
```

The `aphex()` Vite plugin does this automatically in dev (it passes
`src/lib/plugins.ts` by default). Without the plugins argument, a `{ type: 'seo' }`
field generates as `unknown`.

## Exports

| Import                           | From                          | What                                      |
| -------------------------------- | ----------------------------- | ----------------------------------------- |
| `seoPlugin(options)`             | `@aphexcms/plugin-seo`        | The plugin (register in `plugins.ts`)     |
| `SeoPluginOptions`               | `@aphexcms/plugin-seo`        | Options type                              |
| `seoField(group?)`               | `@aphexcms/plugin-seo/schema` | The reusable SEO object field             |
| `injectSeoField(schema, group?)` | `@aphexcms/plugin-seo/schema` | Idempotent injector transform             |
| `SeoField`                       | `@aphexcms/plugin-seo/schema` | The authored `{ type: 'seo' }` field type |

## Options

```ts
interface SeoPluginOptions extends Partial<SeoGenerators> {
	/** Document type names to auto-enable SEO on (injects the meta field group). */
	collections?: string[];
	/** Field group the SEO fields go in. Default `'seo'`. */
	group?: string;
}
```
