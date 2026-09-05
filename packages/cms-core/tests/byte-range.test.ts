import { describe, it, expect } from 'vitest';
import { parseByteRange } from '../src/lib/routes/assets-cdn';

const SIZE = 1000; // bytes 0..999

describe('parseByteRange', () => {
	describe('falls through to a full 200 response', () => {
		// `null` means "serve the whole body", which is a legal answer to any Range
		// request. Everything here is a case where honouring the header is either
		// impossible or not worth the complexity.
		it('when there is no header', () => {
			expect(parseByteRange(null, SIZE)).toBeNull();
		});

		it('when the size is unknown, because Content-Range could not be filled in', () => {
			expect(parseByteRange('bytes=0-99', null)).toBeNull();
			expect(parseByteRange('bytes=0-99', 0)).toBeNull();
		});

		it('for units we do not serve', () => {
			expect(parseByteRange('items=0-99', SIZE)).toBeNull();
			expect(parseByteRange('bytes 0-99', SIZE)).toBeNull();
		});

		it('for multipart ranges', () => {
			// Legal to answer with the full body, and essentially nothing sends them.
			expect(parseByteRange('bytes=0-99,200-299', SIZE)).toBeNull();
		});

		it('for a header with neither bound', () => {
			expect(parseByteRange('bytes=-', SIZE)).toBeNull();
		});
	});

	describe('satisfiable ranges', () => {
		it('reads both bounds inclusively', () => {
			// 0-0 is one byte, not zero: the end is inclusive in HTTP.
			expect(parseByteRange('bytes=0-0', SIZE)).toEqual({ start: 0, end: 0 });
			expect(parseByteRange('bytes=0-99', SIZE)).toEqual({ start: 0, end: 99 });
			expect(parseByteRange('bytes=500-999', SIZE)).toEqual({ start: 500, end: 999 });
		});

		it('runs an open-ended range to the last byte', () => {
			expect(parseByteRange('bytes=500-', SIZE)).toEqual({ start: 500, end: 999 });
			expect(parseByteRange('bytes=0-', SIZE)).toEqual({ start: 0, end: 999 });
		});

		it('treats a leading-dash range as a suffix, not an offset', () => {
			// `bytes=-500` is the LAST 500 bytes. Reading it as "from 500 onwards"
			// serves the wrong half of the file to a player seeking near the end —
			// and for this size the two readings are indistinguishable by length,
			// which is what makes the bug survive a casual test.
			expect(parseByteRange('bytes=-500', SIZE)).toEqual({ start: 500, end: 999 });
			expect(parseByteRange('bytes=-1', SIZE)).toEqual({ start: 999, end: 999 });
		});

		it('clamps a suffix longer than the object to the whole object', () => {
			expect(parseByteRange('bytes=-5000', SIZE)).toEqual({ start: 0, end: 999 });
		});

		it('clamps an end past the object rather than rejecting it', () => {
			// RFC 9110: an over-long end means "the remainder". Players routinely ask
			// for more than exists, and answering 416 there breaks playback.
			expect(parseByteRange('bytes=900-5000', SIZE)).toEqual({ start: 900, end: 999 });
		});

		it('tolerates surrounding whitespace', () => {
			expect(parseByteRange('  bytes=0-99  ', SIZE)).toEqual({ start: 0, end: 99 });
		});
	});

	describe('unsatisfiable ranges', () => {
		// Distinct from `null`: these are well-formed but outside the object, and
		// must be answered 416. Serving a full body instead hands a client bytes it
		// explicitly did not ask for.
		it('when the start is at or past the end of the object', () => {
			expect(parseByteRange('bytes=1000-', SIZE)).toBe('unsatisfiable');
			expect(parseByteRange('bytes=1000-1100', SIZE)).toBe('unsatisfiable');
			expect(parseByteRange('bytes=5000-6000', SIZE)).toBe('unsatisfiable');
		});

		it('when the range runs backwards', () => {
			expect(parseByteRange('bytes=500-100', SIZE)).toBe('unsatisfiable');
		});

		it('for a zero-length suffix', () => {
			// `bytes=-0` asks for the last zero bytes, which cannot be satisfied.
			expect(parseByteRange('bytes=-0', SIZE)).toBe('unsatisfiable');
		});
	});

	describe('the length implied by a range', () => {
		// The route sends `end - start + 1` as Content-Length. A length that
		// disagrees with the body truncates the response or hangs the client, so
		// pin the arithmetic rather than trusting it by inspection.
		const lengthOf = (header: string) => {
			const result = parseByteRange(header, SIZE);
			if (!result || result === 'unsatisfiable') throw new Error(`not a range: ${header}`);
			return result.end - result.start + 1;
		};

		it('counts inclusively', () => {
			expect(lengthOf('bytes=0-0')).toBe(1);
			expect(lengthOf('bytes=0-99')).toBe(100);
			expect(lengthOf('bytes=-500')).toBe(500);
			expect(lengthOf('bytes=0-')).toBe(SIZE);
		});
	});
});
