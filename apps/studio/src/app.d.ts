// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
import type { CMSInstances } from '@aphexcms/cms-core/server';
import type { Auth } from '@aphexcms/cms-core/server';

// Side-effect imports that activate module augmentations globally:
// - generated-types: schema-derived document/collection types
// - @aphexcms/cms-core/app-augment: PageData.rbac typing
import '$lib/generated-types';
import '@aphexcms/cms-core/app-augment';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			aphexCMS: CMSInstances;
			auth?: Auth; // Available in protected routes
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
