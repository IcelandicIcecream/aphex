import type { PageServerLoad } from './$types';
import { loadArchivePage } from '$lib/server/archive-page';

/** Page 1 of the post archive. Later pages live at /posts/page/2, /posts/page/3, … */
export const load: PageServerLoad = async ({ locals, url }) => loadArchivePage(locals, url, 1);
