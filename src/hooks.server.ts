import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config';

// CMS hook for dependency injection
const aphexHook = createCMSHook(cmsConfig);

// Your existing routing logic
const routingHook = async ({ event, resolve }) => {
  if (event.url.pathname === '/') {
    throw redirect(302, '/admin');
  }
  return resolve(event);
};

// Combine hooks
export const handle = sequence(aphexHook, routingHook);