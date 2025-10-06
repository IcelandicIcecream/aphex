// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
//
import type { CMSInstances } from './config.js';
import type { Auth } from './types.js';
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
