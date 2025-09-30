import { useGraphQlJit } from '@envelop/graphql-jit';
import { createYoga, createSchema } from 'graphql-yoga';
import type { RequestEvent } from '@sveltejs/kit';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { generateGraphQLSchema } from '$lib/graphql/schema.js';
import { createResolvers } from '$lib/graphql/resolvers.js';
import { createCMS, getCMS } from '$lib/cms/engine.js';
import { loadCMSConfig } from '$lib/cms/config-loader.js';

let yogaApp: any = null;

async function initializeYoga() {
  if (!yogaApp) {
    // Load fresh config and schema types
    const config = await loadCMSConfig();

    // Initialize CMS if not already done
    let cms;
    try {
      cms = getCMS();
    } catch {
      cms = createCMS(config);
      await cms.initialize();
    }

    // Generate GraphQL schema from CMS schema types
    const typeDefs = generateGraphQLSchema(config.schemaTypes);
    const resolvers = createResolvers(cms, config.schemaTypes);

    yogaApp = createYoga<RequestEvent>({
      logging: false,
      schema: createSchema({
        typeDefs,
        resolvers
      }),
      plugins: [
        useGraphQlJit()
      ],
      graphqlEndpoint: '/api/graphql',
      renderGraphiQL,
      fetchAPI: { Response },
      graphiql: {
        defaultQuery: /* GraphQL */ `
          # Welcome to TCR CMS GraphQL API
          # Try these example queries:

          # Get all draft pages
          {
            allPage(perspective: "draft") {
              id
              title
              slug
              createdAt
              updatedAt
            }
          }

          # Get published simple documents
          {
            allSimple_document(perspective: "published") {
              id
              title
              description
            }
          }

          # Get a single page by ID
          {
            page(id: "your-page-id", perspective: "draft") {
              id
              title
              slug
              hero {
                heading
                subheading
              }
              content {
                ... on TextBlock {
                  heading
                  content
                }
                ... on ImageBlock {
                  image
                  caption
                  alt
                }
                ... on CallToAction {
                  title
                  description
                  buttonText
                  buttonUrl
                }
              }
            }
          }
        `
      }
    });
  }

  return yogaApp;
}

// Export Yoga handlers
export async function GET(event: RequestEvent) {
  const yoga = await initializeYoga();
  return yoga.fetch(event.request, event);
}

export async function POST(event: RequestEvent) {
  const yoga = await initializeYoga();
  return yoga.fetch(event.request, event);
}

export async function OPTIONS(event: RequestEvent) {
  const yoga = await initializeYoga();
  return yoga.fetch(event.request, event);
}