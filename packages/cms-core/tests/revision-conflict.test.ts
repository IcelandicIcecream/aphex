import { describe, expect, it } from 'vitest';
import { isRevisionConflictError, RevisionConflictError } from '../src/lib/db/interfaces/index';

describe('isRevisionConflictError', () => {
	it('recognises the class', () => {
		expect(isRevisionConflictError(new RevisionConflictError('stale', 'd1', 1, 2))).toBe(true);
	});

	it('recognises one thrown by a second copy of cms-core, where instanceof fails', () => {
		// What an adapter throws when the app loaded cms-core twice: same name, other class.
		class RevisionConflictErrorCopy extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'RevisionConflictError';
			}
		}
		const copy = new RevisionConflictErrorCopy('stale');
		expect(copy instanceof RevisionConflictError).toBe(false);
		expect(isRevisionConflictError(copy)).toBe(true);
	});

	it('ignores other errors', () => {
		expect(isRevisionConflictError(new Error('boom'))).toBe(false);
		expect(isRevisionConflictError({ name: 'RevisionConflictError' })).toBe(false);
		expect(isRevisionConflictError(undefined)).toBe(false);
	});
});
