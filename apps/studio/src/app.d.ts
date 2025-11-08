// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
import type { CMSInstances } from '@aphexcms/cms-core/server';
import type { Auth } from '@aphexcms/cms-core/server';

// Import generated types to activate module augmentation globally
import '$lib/generated-types';

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
