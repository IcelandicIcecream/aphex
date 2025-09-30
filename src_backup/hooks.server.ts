import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/') {
    throw redirect(302, '/admin');
  }

  return resolve(event);
};