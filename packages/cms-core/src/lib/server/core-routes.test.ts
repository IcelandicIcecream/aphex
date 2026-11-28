import { describe, expect, it } from 'vitest';
import { hostRouteUnder } from './core-routes';

describe('hostRouteUnder', () => {
	it('is true for the host’s own routes under the prefix, groups aside', () => {
		expect(hostRouteUnder('/api/orders', '/api')).toBe(true);
		expect(hostRouteUnder('/api/[...slug]', '/api')).toBe(true);
		expect(hostRouteUnder('/(app)/api/sessions/[id]', '/api')).toBe(true);
		expect(hostRouteUnder('/media/[id]/[filename]', '/media')).toBe(true);
	});

	it('is false for a parameter route elsewhere that happens to match', () => {
		expect(hostRouteUnder('/(app)/[school]/[personality]', '/api')).toBe(false);
		expect(hostRouteUnder('/[...rest]', '/api')).toBe(false);
		expect(hostRouteUnder('/[slug]', '/media')).toBe(false);
		expect(hostRouteUnder('/apiary', '/api')).toBe(false);
		expect(hostRouteUnder(null, '/api')).toBe(false);
	});
});
