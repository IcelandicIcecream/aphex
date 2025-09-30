import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createCMSHook, createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './lib/schemaTypes';
import { DATABASE_URL } from '$env/static/private';

// Create CMS configuration
const cmsConfig = createCMSConfig({
  schemas,
  database: {
    adapter: 'postgresql',
    connectionString: DATABASE_URL
  },
  storage: {
    adapter: 'local',
    basePath: './static/uploads',
    baseUrl: '/uploads'
  }
});

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