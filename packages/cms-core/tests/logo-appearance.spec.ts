import { describe, expect, it } from 'vitest';
import { shouldInvertLogoOnDark } from '../src/lib/logo-appearance';

describe('shouldInvertLogoOnDark', () => {
	it('inverts transparent near-black logos', () => {
		expect(shouldInvertLogoOnDark({ hasAlpha: true, dominantColor: { r: 18, g: 18, b: 18 } })).toBe(
			true
		);
	});

	it('does not invert opaque or colored logos', () => {
		expect(
			shouldInvertLogoOnDark({ hasAlpha: false, dominantColor: { r: 10, g: 10, b: 10 } })
		).toBe(false);
		expect(
			shouldInvertLogoOnDark({ hasAlpha: true, dominantColor: { r: 15, g: 50, b: 140 } })
		).toBe(false);
	});

	it('fails safely when image metadata is unavailable', () => {
		expect(shouldInvertLogoOnDark(null)).toBe(false);
		expect(shouldInvertLogoOnDark({ hasAlpha: true })).toBe(false);
	});
});
