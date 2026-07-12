// Aphex plugins consume `@aphexcms/cms-core` from source, so this package's
// `svelte-check` follows into cms-core's server files, which rely on the
// SvelteKit `App.Locals` augmentation a host app provides. Re-declare it here so
// the plugin type-checks standalone (in an app, the app's own app.d.ts wins).
import type { CMSInstances, Auth, PreviewPerspective } from '@aphexcms/cms-core/server';

declare global {
	namespace App {
		interface Locals {
			aphexCMS: CMSInstances;
			auth?: Auth;
			previewPerspective?: PreviewPerspective;
		}
	}
}

export {};
