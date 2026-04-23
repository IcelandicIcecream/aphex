/**
 * Unit tests for role request normalization — write caps should imply reads.
 */
import { describe, it, expect } from 'vitest';
import { createRoleRequest, updateRoleRequest } from '@aphexcms/cms-core/api/schemas/roles';

function parseCreate(input: unknown) {
	const r = createRoleRequest.safeParse(input);
	if (!r.success) throw new Error(JSON.stringify(r.error.issues));
	return r.data;
}
function parseUpdate(input: unknown) {
	const r = updateRoleRequest.safeParse(input);
	if (!r.success) throw new Error(JSON.stringify(r.error.issues));
	return r.data;
}

describe('createRoleRequest — capability normalization', () => {
	it('document.create implies document.read', () => {
		const d = parseCreate({ name: 'Editor-lite', capabilities: ['document.create'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['document.create', 'document.read']));
	});

	it('asset.upload implies asset.read', () => {
		const d = parseCreate({ name: 'Uploader', capabilities: ['asset.upload'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['asset.upload', 'asset.read']));
	});

	it('mgmt-only caps are left alone', () => {
		const d = parseCreate({ name: 'Inviter', capabilities: ['member.invite'] });
		expect(d.capabilities).toEqual(['member.invite']);
	});

	it('empty capabilities list is kept empty', () => {
		const d = parseCreate({ name: 'Placeholder' });
		expect(d.capabilities).toEqual([]);
	});
});

describe('updateRoleRequest — capability normalization', () => {
	it('write caps imply reads on update too', () => {
		const d = parseUpdate({ capabilities: ['document.publish'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['document.publish', 'document.read']));
	});

	it('description-only update leaves capabilities undefined', () => {
		const d = parseUpdate({ description: 'new desc' });
		expect(d.capabilities).toBeUndefined();
	});
});
