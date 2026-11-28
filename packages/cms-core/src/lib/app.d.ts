// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
import type { CMSInstances } from './hooks.js';
import type { Auth, Organization } from './types/index.js';
import type { PreviewPerspective } from './preview/perspective.js';
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			aphexCMS: CMSInstances;
			aphexAuth?: Auth; // CMS session, populated by the Aphex auth hook on /admin, /api and /media
			previewPerspective?: PreviewPerspective; // Read perspective, resolved per-request by the CMS hook
			aphexTenant?: string | null; // Organization slug the host's hook takes from the URL
			aphexTenantOrganization?: Organization | null; // That organization, looked up by the CMS hook
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
