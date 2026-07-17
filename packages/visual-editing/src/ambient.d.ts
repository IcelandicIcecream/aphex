// Load SvelteKit's ambient module declarations.
//
// `AphexVisualOverlay.svelte` imports `invalidateAll` from `$app/navigation`. That
// module isn't resolvable by node — SvelteKit declares it ambiently in its own types
// (`@sveltejs/kit/types/index.d.ts`), and those only enter the program if something
// pulls kit's types in. A library that imports nothing else from `@sveltejs/kit` never
// does, so the import fails to typecheck.
//
// Referencing it here makes that dependency explicit and deliberate rather than a side
// effect of some unrelated `import type { Handle } from '@sveltejs/kit'` elsewhere in
// the package — which is exactly how it works in cms-core, and would break the moment
// that import was tidied away.
//
// Lives outside `src/lib` so `svelte-package` doesn't publish it: it's a build-time
// concern, and consumers get `$app` types from their own SvelteKit app.
/// <reference types="@sveltejs/kit" />
