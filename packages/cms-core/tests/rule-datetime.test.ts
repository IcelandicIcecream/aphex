import { describe, it, expect } from 'vitest';
import { Rule } from '../src/lib/field-validation/rule';

// Regression: a `datetime` field must accept a canonical ISO-8601 timestamp, not just the
// admin display format. The shipped `contactSubmission` example stamps `new Date().toISOString()`
// in a beforeValidate hook — that value has to pass its own field's auto datetime validation.
describe('Rule.datetime', () => {
	const dt = () => new Rule('datetime').datetime();

	it('accepts an ISO-8601 timestamp with milliseconds + Z (what toISOString produces)', async () => {
		const markers = await dt().validate('2026-07-19T08:30:39.611Z');
		expect(markers.filter((m) => m.level === 'error')).toHaveLength(0);
	});

	it('accepts ISO-8601 without fractional seconds and with a numeric offset', async () => {
		expect(
			(await dt().validate('2026-07-19T08:30:39+05:00')).filter((m) => m.level === 'error')
		).toHaveLength(0);
		expect(
			(await dt().validate('2026-07-19T08:30:00Z')).filter((m) => m.level === 'error')
		).toHaveLength(0);
	});

	it('still accepts the admin display format (YYYY-MM-DD HH:mm)', async () => {
		expect(
			(await dt().validate('2026-07-19 08:30')).filter((m) => m.level === 'error')
		).toHaveLength(0);
	});

	it('rejects a non-date string', async () => {
		expect(
			(await dt().validate('not a date')).filter((m) => m.level === 'error').length
		).toBeGreaterThan(0);
	});

	it('rejects a malformed ISO-looking value (bad month/hour)', async () => {
		expect(
			(await dt().validate('2026-13-19T25:99:00Z')).filter((m) => m.level === 'error').length
		).toBeGreaterThan(0);
	});
});
