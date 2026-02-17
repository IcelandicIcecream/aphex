import type { CMSInstances } from '../hooks';
import type { SchemaType } from '../types/schemas';
import type { Auth } from '../types/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { generateGraphQLSchema } from './schema';
import { createResolvers } from './resolvers';

export interface GraphQLConfig {
	defaultPerspective?: 'draft' | 'published';
	path?: string;
	enableGraphiQL?: boolean;
	defaultQuery?: string;
}

export interface GraphQLSettings {
	endpoint: string;
	enableGraphiQL: boolean;
}

export interface GraphQLHandlerResult {
	handler: (event: RequestEvent) => Promise<Response> | Response;
	settings: GraphQLSettings;
}

/**
 * Creates a GraphQL handler for the CMS.
 * Uses dynamic imports so graphql dependencies are only loaded when GraphQL is enabled.
 */
export async function createGraphQLHandler(
	cms: CMSInstances,
	schemaTypes: SchemaType[],
	options: GraphQLConfig = {}
): Promise<GraphQLHandlerResult> {
	const endpoint = options.path ?? '/api/graphql';
	const enableGraphiQL = options.enableGraphiQL ?? true;
	const defaultPerspective = options.defaultPerspective ?? 'published';

	// Lazy-load GraphQL dependencies
	const [{ createYoga, createSchema }, { useGraphQlJit }, { renderGraphiQL }] = await Promise.all([
		import('graphql-yoga'),
		import('@envelop/graphql-jit'),
		import('@graphql-yoga/render-graphiql')
	]);

	// Generate GraphQL schema and resolvers from CMS schema types
	const typeDefs = generateGraphQLSchema(schemaTypes);
	const resolvers = createResolvers(cms, schemaTypes, defaultPerspective);

	const yogaApp = createYoga<RequestEvent>({
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
			// Extract auth and localAPI from event.locals (set by auth hook)
			const auth = (event.locals as { auth?: Auth }).auth;
			const localAPI = event.locals.aphexCMS?.localAPI;

			if (!auth || auth.type === 'partial_session') {
				throw new Error('Unauthorized: Authentication required for GraphQL');
			}

			if (!localAPI) {
				throw new Error('LocalAPI not initialized');
			}

			// Return context with organizationId, auth, and localAPI
			return {
				organizationId: auth.organizationId,
				auth,
				localAPI
			};
		},
		graphiql: enableGraphiQL
			? {
					defaultQuery:
						options.defaultQuery ||
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

	console.log(`✅ GraphQL initialized at ${endpoint}`);

	return {
		handler: async (event: RequestEvent) => {
			return yogaApp.fetch(event.request, event);
		},
		settings: {
			endpoint,
			enableGraphiQL
		}
	};
}
