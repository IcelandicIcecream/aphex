# @aphexcms/ui

The shared [shadcn-svelte](https://shadcn-svelte.com) component library behind the [AphexCMS](https://github.com/IcelandicIcecream/aphex) admin.

This exists so `cms-core` and first-party plugins render the same controls, and so a plugin author can build a settings panel that looks like the rest of the admin without copying components in. It is a peer dependency of `@aphexcms/cms-core`, not an optional add-on.

## Install

```bash
pnpm add @aphexcms/ui
```

## Usage

Each component has its own entry point — there is no root barrel, deliberately, so importing a button doesn't pull the whole library into your chunk:

```svelte
<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
</script>

<Button variant="outline">Save</Button>
```

Styling is Tailwind CSS v4 with shared CSS variables. Import them once, in your root stylesheet:

```css
@import '@aphexcms/ui/shadcn/css';
```

## What's in it

Roughly thirty-five components: the shadcn-svelte set (button, input, select, dialog, dropdown-menu, popover, sidebar, tabs, tooltip, calendar, command, …) plus a few Aphex additions used by the admin — `bubble`, `marker`, `message`, `message-scroller` and `attachment`, which back the in-admin agent's chat surface.

`@aphexcms/ui/utils` exports `cn()` and the `WithElementRef` helper type that the components share.

## Adding a component

In the Aphex monorepo:

```bash
pnpm shadcn <component-name>
```

That runs `shadcn-svelte add` against this package and regenerates the export map. Don't hand-edit `exports` — `scripts/generate-exports.js` owns it, and the build regenerates it.

## License

MIT
