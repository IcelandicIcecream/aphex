import { createAdminLoad } from '@aphexcms/cms-core/server';

// The whole admin surface loads through one core helper. A view a release adds
// is served without editing this file — the "feed the routes" half of embedded
// Aphex. Never hand-edit.
export const load = createAdminLoad();
