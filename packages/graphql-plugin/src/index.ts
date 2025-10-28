import type { CMSPlugin, CMSInstances, Auth } from '@aphexcms/cms-core/server';
import type { RequestEvent } from '@sveltejs/kit';
import { createYoga, createSchema } from 'graphql-yoga';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { generateGraphQLSchema } from './schema.js';
import { createResolvers } from './resolvers.js';

export interface GraphQLPluginConfig {
	endpoint?: string;
	enableGraphiQL?: boolean;
	defaultQuery?: string;
	defaultPerspective?: 'draft' | 'published';
}

export function createGraphQLPlugin(config: GraphQLPluginConfig = {}): CMSPlugin {
	const endpoint = config.endpoint ?? '/api/graphql';
	const enableGraphiQL = config.enableGraphiQL ?? true;
	let yogaApp: any = null;

	return {
		name: '@aphexcms/graphql-plugin',
		version: '0.1.0',
		config: {
			endpoint,
			enableGraphiQL
		},

		// Define routes this plugin handles
		routes: {
			[endpoint]: async (event: RequestEvent) => {
				if (!yogaApp) {
					return new Response('GraphQL not initialized', { status: 500 });
				}
				return yogaApp.fetch(event.request, event);
			}
		},

		// Initialize during CMS startup
		install: async (cms: CMSInstances) => {
			// Generate GraphQL schema and resolvers from CMS schema types
			const typeDefs = generateGraphQLSchema(cms.config.schemaTypes);
			const resolvers = createResolvers(cms, cms.config.schemaTypes, config.defaultPerspective);

			yogaApp = createYoga<RequestEvent>({
				logging: false,
				schema: createSchema({
					typeDefs,
					resolvers
				}),
				plugins: [useGraphQlJit()],
				graphqlEndpoint: endpoint,
				renderGraphiQL,
				fetchAPI: { Response },
				context: async (event: RequestEvent) => {
					// Extract auth from event.locals (set by auth hook)
					const auth = (event.locals as { auth?: Auth }).auth;

					if (!auth) {
						throw new Error('Unauthorized: Authentication required for GraphQL');
					}

					// Return context with organizationId
					return {
						organizationId: auth.organizationId,
						auth
					};
				},
				graphiql: enableGraphiQL
					? {
							defaultQuery:
								config.defaultQuery ||
								`# Welcome to Aphex GraphQL API
# Try these example queries:

# Get all documents of a type (replace 'page' with your document type)
{
  allPage(perspective: "draft") {
    id
    title
    createdAt
    updatedAt
  }
}

# Get a single document by ID
{
  page(id: "your-page-id", perspective: "draft") {
    id
    title
  }
}`
						}
					: false
			});

			console.log(`✅ GraphQL plugin installed at ${endpoint}`);
		}
	};
}
