import { describe, expect, it } from 'vitest';
import { createSchema } from 'graphql-yoga';
import type { Field, SchemaType } from '@aphexcms/cms-core';
import type { CMSInstances } from '@aphexcms/cms-core/server';
import { generateGraphQLSchema } from '@aphexcms/cms-core/graphql/schema';
import { createResolvers } from '@aphexcms/cms-core/graphql/resolvers';

const link: Field = {
	name: 'link',
	type: 'object',
	title: 'Link',
	fields: [{ name: 'page', type: 'reference', title: 'Page', to: [{ type: 'gqlPage' }] }]
};
const inside = (name: string): Field => ({ name, type: 'object', title: name, fields: [link] });

const schemaTypes: SchemaType[] = [
	{
		name: 'gqlPage',
		type: 'document',
		title: 'Page',
		fields: [{ name: 'title', type: 'string', title: 'Title' }]
	},
	{
		name: 'gqlSettings',
		type: 'document',
		title: 'Settings',
		fields: [inside('announcement'), inside('banner')]
	}
];

// `createResolvers` only builds functions here; none is called, so it needs no real CMS.
const build = () => {
	const cms: Partial<CMSInstances> = {};
	const resolvers = createResolvers(cms as CMSInstances, schemaTypes, 'published');
	const typeDefs = generateGraphQLSchema(schemaTypes);
	return { resolvers, schema: createSchema({ typeDefs, resolvers }) };
};

describe('GraphQL types for objects within objects', () => {
	it('builds a schema with a reference two objects deep', () => {
		expect(() => build()).not.toThrow();
	});

	it('resolves same-named objects under different parents separately', () => {
		const { resolvers, schema } = build();
		for (const parent of ['announcement', 'banner']) {
			const name = `GqlSettings${parent}linkObject`;
			expect(schema.getType(name), name).toBeTruthy();
			expect(resolvers[name].page, name).toBeTypeOf('function');
		}
	});
});
