/**
 * Unit tests for API-key request normalization.
 * No network / DB — just exercises the Zod transform.
 */
import { describe, it, expect } from 'vitest';
import { createApiKeyRequest } from '@aphexcms/cms-core/api/schemas/api-keys';

function parse(input: unknown) {
	const r = createApiKeyRequest.safeParse(input);
	if (!r.success) throw new Error(JSON.stringify(r.error.issues));
	return r.data;
}

describe('createApiKeyRequest — permissions normalization', () => {
	it('write implies read', () => {
		const d = parse({ name: 'k', permissions: ['write'] });
		expect(d.permissions).toEqual(['read', 'write']);
	});

	it('read alone stays read', () => {
		const d = parse({ name: 'k', permissions: ['read'] });
		expect(d.permissions).toEqual(['read']);
	});

	it('read+write is preserved', () => {
		const d = parse({ name: 'k', permissions: ['read', 'write'] });
		expect(d.permissions).toEqual(['read', 'write']);
	});

	it('rejects when both permissions and capabilities are missing', () => {
		const r = createApiKeyRequest.safeParse({ name: 'k' });
		expect(r.success).toBe(false);
	});
});

describe('createApiKeyRequest — capabilities normalization (write implies read per family)', () => {
	it('document.create adds document.read', () => {
		const d = parse({ name: 'k', capabilities: ['document.create'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['document.create', 'document.read']));
	});

	it('document.publish adds document.read', () => {
		const d = parse({ name: 'k', capabilities: ['document.publish'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['document.publish', 'document.read']));
	});

	it('asset.upload adds asset.read', () => {
		const d = parse({ name: 'k', capabilities: ['asset.upload'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['asset.upload', 'asset.read']));
	});

	it('asset.delete adds asset.read', () => {
		const d = parse({ name: 'k', capabilities: ['asset.delete'] });
		expect(d.capabilities).toEqual(expect.arrayContaining(['asset.delete', 'asset.read']));
	});

	it('mixed write caps add both reads exactly once', () => {
		const d = parse({
			name: 'k',
			capabilities: ['document.create', 'document.update', 'asset.upload']
		});
		const caps = d.capabilities!;
		expect(caps).toEqual(expect.arrayContaining(['document.read', 'asset.read']));
		expect(caps.filter((c) => c === 'document.read')).toHaveLength(1);
		expect(caps.filter((c) => c === 'asset.read')).toHaveLength(1);
	});

	it('does not add reads when no writes are present', () => {
		const d = parse({ name: 'k', capabilities: ['member.invite'] });
		expect(d.capabilities).toEqual(['member.invite']);
	});

	it('read-only caps remain read-only', () => {
		const d = parse({ name: 'k', capabilities: ['document.read'] });
		expect(d.capabilities).toEqual(['document.read']);
	});

	it('management caps (member.*/role.*/org.*/apiKey.*) do not pull in reads', () => {
		const d = parse({
			name: 'k',
			capabilities: [
				'member.invite',
				'member.remove',
				'role.manage',
				'org.settings',
				'apiKey.manage'
			]
		});
		expect(d.capabilities).not.toContain('document.read');
		expect(d.capabilities).not.toContain('asset.read');
	});

	// The zod layer is a *format* guard, not an allowlist: plugin-declared
	// capabilities don't exist at module-eval time, so the authoritative check is
	// the route handler against the runtime registry (`partResolver
	// .capabilityCatalog()`). A well-formed id it's never heard of therefore
	// parses here and is rejected one layer up.
	it('accepts a well-formed but unknown capability id, leaving the check to the route', () => {
		const r = createApiKeyRequest.safeParse({ name: 'k', capabilities: ['document.hack'] });
		expect(r.success).toBe(true);
	});

	it('rejects a malformed capability id', () => {
		const r = createApiKeyRequest.safeParse({ name: 'k', capabilities: ['not a capability'] });
		expect(r.success).toBe(false);
	});
});
