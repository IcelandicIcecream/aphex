# @aphexcms/plugin-phosphor-icons

An `icon` field for AphexCMS: a searchable picker of [Phosphor](https://phosphoricons.com)'s 1,512 icons in six weights, and a component that draws the chosen icon.

```ts
// aphex.config.ts (and aphex.client.ts, if your plugins list is shared)
import { phosphorIconsPlugin } from '@aphexcms/plugin-phosphor-icons';
plugins: [phosphorIconsPlugin()];

// a schema
{ name: 'icon', type: 'icon', title: 'Icon' }
{ name: 'badge', type: 'icon', weight: 'duotone', weights: ['regular', 'duotone'] }
```

```svelte
<script>
	import Icon from '@aphexcms/plugin-phosphor-icons/icon';
</script>

<Icon value={item.icon} class="size-6" />
```

## What's stored

`{ name, weight, path, shade? }`: the icon's name and weight, and its drawing (`path`, plus `shade` for two-tone). The drawing is saved with the choice, so a site draws icons from the document alone and ships no icon set. The admin loads one weight's drawings (about 200 KB compressed) when the picker opens.

A value needs only its name. Saving fills the drawing in (a `beforeValidate` hook the plugin adds to every document type holding an icon field), so an import, a script or the site's AI can write `{ "name": "coffee" }`. An unknown name is kept as written and draws nothing.

`icon` reads the field's type as `{ type: 'icon' }` everywhere once the plugin is imported. `icon({ name })` from `/schema` builds the same field.

## For the site's AI

The plugin adds a `search_icons` tool (names by meaning: "cafe" finds `coffee`) and a short section to what MCP clients are told on connecting.

## Entry points

- `.`: the plugin, `Icon`, constants and types.
- `./icon`: the `Icon` component alone, for sites.
- `./value`: `isDrawableIcon` and `isIconValue`, no data.
- `./lookup`: `searchIcons`, `resolveIcon`, `iconPaths` (loads data on demand).
- `./schema`: `icon()`, `expandIconTypes`.

## Updating the icons

`src/lib/data` is generated from `@phosphor-icons/core` (MIT):

```sh
npm pack @phosphor-icons/core@2.1.1 && tar xzf phosphor-icons-core-2.1.1.tgz
pnpm generate ./package
```

Icons © Phosphor Icons, MIT licence.
