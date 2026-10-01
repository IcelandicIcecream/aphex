import type { Auth } from '../types/index';

/**
 * `@auth/sveltekit` declares `App.Locals.auth` as its own session getter, and
 * cms-core keeps its own `Auth` on the same key, so an app using both fails
 * type-check on any direct `locals.auth` read or write. cms-core reads and
 * writes through this typed view instead of `event.locals.auth` directly, so
 * both libraries can coexist without either widening the shared global type.
 */
export function aphexLocals(locals: App.Locals): { auth?: Auth } {
	return locals as unknown as { auth?: Auth };
}
