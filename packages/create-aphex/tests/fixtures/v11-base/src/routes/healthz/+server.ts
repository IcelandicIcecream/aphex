// Liveness/readiness probe for the platform in front of this app.
//
// The judgement about what "healthy" means — settling a check that throws,
// bounding one that hangs, keeping the result coarse enough to be public — lives
// in `checkHealth`, so it improves with a cms-core bump rather than staying frozen
// at whatever this file was scaffolded from. What stays here is the HTTP shape,
// which is the app's call: add your own checks to the response, or require a
// header, without touching the adapter logic.
//
// 503 rather than 500 on failure: the app is up but not ready to serve, which is
// what tells an orchestrator to stop routing traffic here without recycling the
// container.
import { json } from '@sveltejs/kit';
import { checkHealth } from '@aphexcms/cms-core/server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const health = await checkHealth(locals.aphexCMS);
	return json(health, { status: health.ok ? 200 : 503 });
};
