import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { convertDateTimeToISO } from '../src/lib/field-validation/date-utils';

describe('convertDateTimeToISO', () => {
	// Europe/Berlin has a non-zero offset in both winter (CET, UTC+1) and
	// summer (CEST, UTC+2), so a bug that reads the `Z` suffix as a literal
	// instead of parsing in UTC moves the stored instant in both cases.
	let originalTz: string | undefined;

	beforeEach(() => {
		originalTz = process.env.TZ;
		process.env.TZ = 'Europe/Berlin';
	});

	afterEach(() => {
		if (originalTz === undefined) delete process.env.TZ;
		else process.env.TZ = originalTz;
	});

	it('runs in a zone with a non-zero offset, or it proves nothing', () => {
		expect(new Date('2026-10-01T12:00:00Z').getTimezoneOffset()).not.toBe(0);
	});

	it('round-trips an ISO datetime as the same instant, in winter and summer time', () => {
		expect(convertDateTimeToISO('2026-01-15T12:00:00Z', 'YYYY-MM-DD')).toBe('2026-01-15T12:00:00Z');
		expect(convertDateTimeToISO('2026-07-15T12:00:00Z', 'YYYY-MM-DD')).toBe('2026-07-15T12:00:00Z');
	});

	it('converts a value typed in the user format to the same UTC instant', () => {
		// 12:00 local in Berlin summer time (CEST, UTC+2) is 10:00 UTC.
		expect(convertDateTimeToISO('2026-07-15 12:00', 'YYYY-MM-DD')).toBe('2026-07-15T10:00:00Z');
	});
});
