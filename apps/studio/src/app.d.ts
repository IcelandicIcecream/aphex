// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
import type { CMSInstances } from '@aphex/cms-core/server';
import type { Auth } from '@aphex/cms-core/server';
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
