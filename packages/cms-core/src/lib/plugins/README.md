# Plugin Architecture: A Sanity-like "Parts" System

This document outlines a vision for a highly extensible, decoupled plugin architecture for Aphex CMS, inspired by the "parts" system used in Sanity Studio.

## Core Concept: The "Parts" System

The goal is to move away from a specialized plugin system, where the core application knows about specific plugin properties like `routes` or `adminUI`, to a generic one.

The core concept is a **"parts" system**. A "part" is a formally defined, named extension point in the application that a plugin can provide an implementation for. The core application doesn't know what a "GraphQL Plugin" is; it only knows how to find and render a "tool" in the admin bar, or how to register a "server route".

---

## The Plugin Contract

We would redefine the `CMSPlugin` interface to be centered around this "parts" concept.

```typescript
/**
 * A generic definition for any piece of functionality a plugin can provide.
 */
export interface PluginPart {
	/**
	 * The name of the part this plugin implements.
	 * @example 'aphex/admin/tool', 'aphex/server/route'
	 */
	implements: string;

	/** The actual implementation (can be a component, a function, etc.) */
	component?: any; // In practice, a SvelteComponent constructor

	/** The handler function for a route part */
	handler?: (event: import('@sveltejs/kit').RequestEvent) => Response | Promise<Response>;

	/** Other metadata the part might need for rendering or execution */
	[key: string]: any;
}

/**
 * The new plugin contract. A plugin is a collection of parts.
 */
export interface CMSPlugin {
	name: string;
	version: string;
	parts?: PluginPart[];
	/** `install` can still be used for complex, one-time setup logic */
	install?: (cms: any) => Promise<void>;
}
```

---

## Defining Core Parts

We would define a set of core "parts" for Aphex CMS. This list can grow over time as more extension points are needed.

- `aphex/server/route`: Implemented by plugins that need to add a server-side API endpoint. The part would include a `path` and a `handler`.
- `aphex/admin/tool`: For adding a top-level, navigable tool (like a tab) to the main admin UI. The part would include an `id`, `title`, and a `component` to render.
- `aphex/field/component`: For registering a custom Svelte component to use for a specific schema field type (e.g., a special string input, a map selector, etc.).
- `aphex/document/action`: For adding a custom action button to the document editor (e.g., "Duplicate", "Translate", "Preview").

---

## Implementation with SvelteKit and Svelte 5

This architecture fits beautifully with SvelteKit's and Svelte 5's features.

### The Part Resolver Service

A singleton service, the "Part Resolver," would be the heart of the system.

1.  **Initialization:** At application startup, the main `hooks.server.ts` would process the `cmsConfig.plugins` array once. It would loop through every plugin and every part, organizing them into a `Map<string, PluginPart[]>`. For example, the key `'aphex/admin/tool'` would hold an array of all tool parts from all installed plugins.
2.  **Injection:** This resolver instance would be attached to SvelteKit's `event.locals`, making it universally available in `load` functions, server-side hooks, and API routes without needing global variables.

### Rendering UI Parts with Svelte 5

Dynamically rendering plugin components becomes trivial and efficient with Svelte 5.

1.  **Data Loading:** In the `+page.server.ts` for the admin UI, the `load` function would use the resolver from `locals` to fetch the necessary parts.
    ```typescript
    // in /routes/admin/+page.server.ts
    export async function load({ locals }) {
    	const { partResolver } = locals.aphexCMS;
    	const adminTools = partResolver.getParts('aphex/admin/tool');
    	return { adminTools };
    }
    ```
2.  **Dynamic Rendering:** The `AdminApp.svelte` component would receive `adminTools` as a prop. It can then dynamically render the tabs and their content using `<svelte:component>`.

    ```svelte
    <!-- AdminApp.svelte -->
    <script lang="ts">
    	let { adminTools = [] } = $props();
    </script>

    <Tabs.Root>
    	<Tabs.List>
    		<!-- Render a trigger for each tool -->
    		{#each adminTools as tool}
    			<Tabs.Trigger value={tool.id}>{tool.title}</Tabs.Trigger>
    		{/each}
    	</Tabs.List>

    	<!-- Render the content for each tool -->
    	{#each adminTools as tool}
    		<Tabs.Content value={tool.id}>
    			<svelte:component this={tool.component} />
    		</Tabs.Content>
    	{/each}
    </Tabs.Root>
    ```

### Handling Server Parts in SvelteKit

The main `hooks.server.ts` would use the resolver to handle non-UI parts. For example, it would get all `aphex/server/route` parts and register their handlers in a dynamic routing map, similar to how `pluginRoutes` works now but in a fully generic way.

---

## Example: The GraphQL Plugin Revisited

Under this system, the GraphQL plugin becomes a clean, declarative manifest of its parts.

```typescript
// In packages/graphql-plugin/src/index.ts
import GraphQLTabComponent from './GraphQLTab.svelte';
import { createYoga } from 'graphql-yoga';

// ... (yoga setup)

export function createGraphQLPlugin(config: GraphQLPluginConfig = {}): CMSPlugin {
    const endpoint = config.endpoint ?? '/api/graphql';
    const yogaApp = /* ... create yoga instance ... */;

    return {
        name: '@aphexcms/graphql-plugin',
        parts: [
            // Part 1: The API endpoint
            {
                implements: 'aphex/server/route',
                path: endpoint,
                handler: (event) => yogaApp.fetch(event.request, event)
            },
            // Part 2: The UI tab in the admin interface
            {
                implements: 'aphex/admin/tool',
                id: 'graphql',
                title: 'GraphQL',
                component: GraphQLTabComponent
            }
        ]
    };
}
```

With this, the core system remains completely agnostic. It doesn't know what "GraphQL" is, it simply knows how to render a "tool" and route a "server route". This is the foundation of a truly configurable and powerful plugin architecture.
