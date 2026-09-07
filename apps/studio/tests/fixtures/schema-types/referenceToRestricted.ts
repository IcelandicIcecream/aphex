import type { SchemaType } from '@aphexcms/cms-core';

/**
 * A freely-readable document holding references to a collection that is *not*
 * freely readable (`edm` restricts read to admin/owner).
 *
 * This shape is the one that makes reference resolution a security boundary
 * rather than a convenience: the parent is readable by anyone, so access control
 * on the target has to be enforced where the reference is followed. Resolving
 * references straight from the database adapter skips that check, which is
 * exactly the regression `graphql-reference-access.test.ts` pins down.
 *
 * Both arities are here because they are separate resolvers in
 * `graphql/resolvers.ts` and only one of them was fixed the first time.
 */
export const referenceToRestricted: SchemaType = {
	type: 'document',
	name: 'referenceToRestricted',
	title: 'Reference To Restricted',
	description: 'Test fixture: public parent pointing at an access-restricted target',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title'
		},
		{
			name: 'campaign',
			type: 'reference',
			title: 'Campaign',
			to: [{ type: 'edm' }]
		},
		{
			name: 'campaigns',
			type: 'array',
			title: 'Campaigns',
			of: [{ type: 'reference', to: [{ type: 'edm' }] }]
		}
	]
};

export default referenceToRestricted;
