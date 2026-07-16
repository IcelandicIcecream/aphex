# @aphexcms/plugin-color-picker

A color field for AphexCMS — a swatch + popover picker (hex / RGB / HSL, optional
alpha). Color is a plugin, not a built-in field type: the engine ships the primitives,
color composes on top of them.

## Install

```bash
pnpm add @aphexcms/plugin-color-picker
```

Register it once in your client-safe plugin registry (`src/lib/plugins.ts`):

```ts
import { colorPickerPlugin } from '@aphexcms/plugin-color-picker';

export const plugins = [colorPickerPlugin()];
```

That single registration does three things: adds the picker widget, registers the
`type: 'color'` field type (so it's type-safe with no extra import), and installs the
transform that expands it.

Those land on **both planes**, so `plugins.ts` has to reach both: `aphex.config.ts`
imports it (the engine needs the transform) and the admin passes it to
`<AdminApp {plugins} />` (the browser needs the widget). Scaffolded projects are already
wired this way, so there's nothing further to do — but in a hand-rolled setup,
registering on only one side leaves you with either a `color` field the engine can't
expand, or an expanded field with no picker.

## Two ways to store a color

The plugin supports two storage shapes. Pick per field by the shape you want to read.

### Rich object — `type: 'color'`

Stores the full `{ hex, alpha, rgb, hsl, hsv }` object (the same model as Sanity's
`@sanity/color-input`), so you can read the color in any format without converting.

```ts
// In a schema — no import needed; registering the plugin makes `type: 'color'`
// available and fully type-safe (autocomplete, typos caught).
{ name: 'brand', type: 'color', title: 'Brand color' }

// Allow an alpha channel:
{ name: 'overlay', type: 'color', title: 'Overlay', alpha: true }
```

Stored value:

```json
{
	"hex": "#9D2F2F",
	"alpha": 1,
	"rgb": { "r": 157, "g": 47, "b": 47, "a": 1 },
	"hsl": { "h": 0, "s": 53.9, "l": 40, "a": 1 },
	"hsv": { "h": 0, "s": 70.1, "v": 61.6, "a": 1 }
}
```

Read `.hex` for a CSS value:

```svelte
<div style:--accent={settings.brand?.hex}>…</div>
```

`type: 'color'` generates a fully-typed nested interface in `generated-types.ts` — not
`unknown` — because the plugin's schema-transform runs during type generation too (see
[How `type: 'color'` works](#how-type-color-works)).

### Plain string — `type: 'string', input: 'color'`

Stores just a CSS color string (`"#9D2F2F"`). Simplest to consume — it drops straight
into CSS — ideal for theme tokens where you never need the other formats.

```ts
{ name: 'accent', type: 'string', input: 'color' }

// Works per-item in arrays too:
{ name: 'palette', type: 'array', of: [{ type: 'string', input: 'color' }] }
```

Hex-only (no rgb/hsl formats in the picker):

```ts
{ name: 'accent', type: 'string', input: 'color', inputOptions: { hexOnly: true } }
```

### The `color()` helper (alternative to `type: 'color'`)

Equivalent to `type: 'color'`, for when you'd rather import a builder than rely on the
ambient type (e.g. to avoid depending on plugin registration order). It accepts the same
field properties the literal does — `access`, `validation`, `group` (including multiple)
— so neither way is more expressive. Import from the server-safe `/schema` entry:

```ts
import { color } from '@aphexcms/plugin-color-picker/schema';

// in a schema's fields:
color({ name: 'brand', title: 'Brand color', group: 'design', alpha: true });
```

## Which should I use?

| Want                                                  | Use                                            |
| ----------------------------------------------------- | ---------------------------------------------- |
| A CSS value that drops straight into `style`/tokens   | `type: 'string', input: 'color'` → `"#…"`      |
| The color in multiple formats (hex + rgb + hsl + hsv) | `type: 'color'` → the object, read `.hex` etc. |
| A builder instead of the ambient type                 | `color({ … })`                                 |

## Type generation

`type: 'color'` only desugars into its object shape during codegen if the type generator
is told about your plugins. Pass your plugin registry as the third argument:

```jsonc
// package.json
"generate:types": "aphex generate:types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts ./src/lib/plugins.ts"
```

The `aphex()` Vite plugin does this automatically in dev (it passes `src/lib/plugins.ts`
by default; override with the `typegen.plugins` option). Without the plugins argument,
`type: 'color'` fields generate as `unknown`.

## How `type: 'color'` works

Color is **not** a new storage primitive — the engine only knows built-in field types.
`type: 'color'` is sugar in two halves:

- **Compile-time:** the plugin augments core's `FieldTypeMap` (via `declare module`), so
  `{ type: 'color' }` is a first-class, type-safe field wherever the plugin is imported.
- **Runtime + codegen:** the plugin's `aphex/schema/transform` part rewrites every
  `{ type: 'color' }` into the rich `object` field **before** the engine, admin, and type
  generator see it. So the stored data is a plain object — portable and interpretable by
  core alone, even if the plugin is later removed.

This is why `type: 'color'` reads like a native type while keeping full type safety and
Aphex's "documents are portable" guarantee.

## Exports

| Import                     | From                                   | What                                   |
| -------------------------- | -------------------------------------- | -------------------------------------- |
| `colorPickerPlugin()`      | `@aphexcms/plugin-color-picker`        | The plugin (register in `plugins.ts`)  |
| `ColorPicker`              | `@aphexcms/plugin-color-picker`        | The standalone picker Svelte component |
| `color()`                  | `@aphexcms/plugin-color-picker/schema` | Rich-color field builder               |
| `ColorValue`, `ColorField` | `@aphexcms/plugin-color-picker/schema` | Types                                  |
