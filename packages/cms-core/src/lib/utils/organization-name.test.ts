import { describe, expect, it } from 'vitest';
import { createOrganizationRequest, updateOrganizationRequest } from '../api/schemas/organizations';
import { cleanOrganizationName } from './organization-name';

describe('cleanOrganizationName', () => {
	it('makes one line with single spaces', () => {
		expect(cleanOrganizationName('  Bob’s \n\n Café\t& Bar  ')).toBe('Bob’s Café & Bar');
	});

	it('removes invisible characters and direction overrides', () => {
		expect(cleanOrganizationName('Ac\u200Bme\uFEFF\u2060 \u202ESite')).toBe('Acme Site');
	});

	it('keeps emoji made with zero-width joiners', () => {
		expect(cleanOrganizationName('Chef 👩\u200D🍳 Kitchen')).toBe('Chef 👩\u200D🍳 Kitchen');
	});

	it('stores one form of an accented letter', () => {
		expect(cleanOrganizationName('Cafe\u0301')).toBe('Caf\u00E9');
	});
});

describe('the organization requests', () => {
	it('save the cleaned name', () => {
		expect(createOrganizationRequest.parse({ name: ' Acme \n Co ', slug: 'acme' }).name).toBe(
			'Acme Co'
		);
		expect(updateOrganizationRequest.parse({ name: 'Acme\u200B' }).name).toBe('Acme');
	});

	it('refuse a name that is only spaces or invisible characters', () => {
		expect(createOrganizationRequest.safeParse({ name: ' \n\u200B ', slug: 'acme' }).success).toBe(
			false
		);
	});

	it('refuse a very long name', () => {
		expect(updateOrganizationRequest.safeParse({ name: 'a'.repeat(201) }).success).toBe(false);
	});
});
