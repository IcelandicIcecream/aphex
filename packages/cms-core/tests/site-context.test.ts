/**
 * `siteContext` decides whose content a public page shows. The case that matters
 * most is the one that must not guess: a multi-tenant app's page with no tenant
 * must not fall back to some customer's content.
 */
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { siteContext } from '../src/lib/server/site-context';
import type { Organization } from '../src/lib/types/organization';

function org(id: string, slug: string, createdAt: string): Organization {
	return {
		id,
		name: slug,
		slug,
		parentOrganizationId: null,
		metadata: null,
		createdBy: 'u0',
		createdAt: new Date(createdAt),
		updatedAt: new Date(createdAt)
	};
}

// Listed newest first, as an unordered query may return them.
const beem = org('org_beem', 'beem', '2026-03-01');
const acme = org('org_acme', 'acme', '2026-01-01');

function locals(extra: Partial<App.Locals> = {}): App.Locals {
	const databaseAdapter = {
		findAllOrganizations: async () => [beem, acme],
		findOrganizationBySlug: async (slug: string) =>
			[acme, beem].find((candidate) => candidate.slug === slug) ?? null
	};
	return { aphexCMS: { databaseAdapter }, ...extra } as never;
}

async function status(promise: Promise<unknown>): Promise<number | null> {
	try {
		await promise;
		return null;
	} catch (thrown) {
		return isHttpError(thrown) ? thrown.status : -1;
	}
}

describe('siteContext', () => {
	it("reads the tenant's content on a tenant's URL", async () => {
		const { organization, context } = await siteContext(
			locals({ aphexTenant: 'beem', aphexTenantOrganization: beem })
		);
		expect(organization.id).toBe(beem.id);
		expect(context).toEqual({
			organizationId: beem.id,
			overrideAccess: true,
			perspective: 'published'
		});
	});

	it('answers 404 for a tenant slug no organization has', async () => {
		expect(
			await status(siteContext(locals({ aphexTenant: 'nope', aphexTenantOrganization: null })))
		).toBe(404);
	});

	it('uses the oldest organization in an app without a tenant hook', async () => {
		const { organization } = await siteContext(locals());
		expect(organization.id).toBe(acme.id);
	});

	it("won't guess on a multi-tenant app's page with no tenant", async () => {
		expect(await status(siteContext(locals({ aphexTenant: null })))).toBe(404);
		const { organization } = await siteContext(locals({ aphexTenant: null }), {
			organization: 'beem'
		});
		expect(organization.id).toBe(beem.id);
	});

	it('reads drafts during an authenticated preview', async () => {
		const { context } = await siteContext(locals({ previewPerspective: 'draft' }));
		expect(context.perspective).toBe('draft');
	});
});
