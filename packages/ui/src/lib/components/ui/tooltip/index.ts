import { Tooltip as TooltipPrimitive } from 'bits-ui';
import Trigger from './tooltip-trigger.svelte';
import Content from './tooltip-content.svelte';

// Explicitly annotated, unlike the sibling barrels (popover, dialog) that re-export their
// primitives bare. bits-ui implements these three as Svelte components, so their inferred
// type is the `$$IsomorphicComponent` declared inside `bits-ui/dist/.../tooltip.svelte` —
// a type with no importable name. `svelte-package` can't write that into a `.d.ts` and
// skips the file entirely, with a warning rather than a non-zero exit, so
// `./shadcn/tooltip` shipped a `types` path pointing at a file that wasn't in the tarball.
// Naming the type through the value import gives the emitter something it can write.
const Root: typeof TooltipPrimitive.Root = TooltipPrimitive.Root;
const Provider: typeof TooltipPrimitive.Provider = TooltipPrimitive.Provider;
const Portal: typeof TooltipPrimitive.Portal = TooltipPrimitive.Portal;

export {
	Root,
	Trigger,
	Content,
	Provider,
	Portal,
	//
	Root as Tooltip,
	Content as TooltipContent,
	Trigger as TooltipTrigger,
	Provider as TooltipProvider,
	Portal as TooltipPortal
};
