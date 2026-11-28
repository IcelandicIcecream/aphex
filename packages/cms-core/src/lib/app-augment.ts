/**
 * SvelteKit ambient type augmentations emitted by Aphex CMS.
 *
 * Side-effect import only — activates the global `App.PageData` shape so
 * `$page.data.rbac` is typed inside any project that uses cms-core, without
 * requiring each app to hand-maintain the `App.PageData` interface.
 *
 * Import once from `src/app.d.ts`:
 *
 * ```ts
 * import '@aphexcms/cms-core/app-augment';
 * ```
 *
 * The module has no runtime — it's purely a type-augmentation carrier. Kept
 * as a `.ts` file (not `.d.ts`) so Vite/SvelteKit can resolve the import path
 * via the package's `./*` export map.
 */

import type { RbacPayload } from './types/capabilities';
import type { Organization } from './types/organization';
import type { PreviewPerspective } from './preview/perspective';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The slug of the organization this request's URL belongs to, such as the
			 * subdomain. Set it in a hook that runs before Aphex's; `null` or unset means
			 * no tenant, and the session's organization applies.
			 */
			aphexTenant?: string | null;
			/**
			 * The organization `aphexTenant` names, looked up by Aphex's hook on every
			 * request, signed in or not. `null` with no tenant, or one no organization has.
			 */
			aphexTenantOrganization?: Organization | null;
			/**
			 * Read perspective resolved once per request by the CMS hook —
			 * `'published'` normally, `'draft'` for an authenticated `?aphex-preview`
			 * session. Site loads inherit it through `siteContext` from
			 * `@aphexcms/cms-core/server`. Override the policy with `preview.resolvePerspective`
			 * in the CMS config.
			 */
			previewPerspective?: PreviewPerspective;
		}
		interface PageData {
			/**
			 * RBAC snapshot from `createAdminLoad`. Absent on public routes, and on the
			 * admin's full-page views (login, invitations).
			 */
			rbac?: RbacPayload;
		}
	}
}

export {};
