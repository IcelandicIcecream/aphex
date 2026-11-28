import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, viewerLocales } from './dates';

const nov22 = new Date(Date.UTC(2026, 10, 22, 12));

describe('formatDate', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('writes the date the reader’s way, from their browser’s languages', () => {
		vi.stubGlobal('navigator', { languages: ['en-AU', 'en'], language: 'en-US' });
		expect(
			formatDate(nov22, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
		).toBe('22/11/2026');
		vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' });
		expect(
			formatDate(nov22, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
		).toBe('11/22/2026');
	});

	it('gives nothing for an empty or unreadable date', () => {
		expect(formatDate(null)).toBe('');
		expect(formatDate('')).toBe('');
		expect(formatDate('not a date')).toBe('');
	});

	it('falls back to Intl’s default for a tag it refuses', () => {
		vi.stubGlobal('navigator', { languages: ['not_a_tag!'], language: '' });
		expect(formatDate(nov22, { year: 'numeric', timeZone: 'UTC' })).toContain('2026');
	});

	it('has no reader on the server', () => {
		vi.stubGlobal('navigator', undefined);
		expect(viewerLocales()).toBeUndefined();
	});
});
