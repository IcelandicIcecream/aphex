// GraphQL endpoint - TODO: Port to package or create as plugin
// Currently disabled - needs CMS Engine infrastructure
//
// TODO: To re-enable GraphQL, you need to either:
// 1. Port the CMS Engine (src_backup/lib/cms/engine.ts) to the package
// 2. Create a GraphQL plugin system (@aphex/cms-graphql-plugin)
// 3. Implement getDocument/listDocuments wrappers around documentService
//
// The GraphQL resolvers (src/lib/graphql/resolvers.ts) expect a cms object with:
// - cms.getDocument(id, perspective) - Get a single document
// - cms.listDocuments(type, options) - List documents by type
//
// These methods need to be implemented or adapted from the package's documentService.

import type { RequestEvent } from '@sveltejs/kit';

/*
Original GraphQL implementation (commented out until infrastructure is ready):

import { useGraphQlJit } from '@envelop/graphql-jit';
import { createYoga, createSchema } from 'graphql-yoga';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';
import { generateGraphQLSchema } from '$lib/graphql/schema.js';
import { createResolvers } from '$lib/graphql/resolvers.js';
import { schemaTypes } from '$lib/schemaTypes/index.js';
import { documentService, assetService } from '@aphex/cms-core/server';

let yogaApp: any = null;

async function initializeYoga() {
  if (!yogaApp) {
    // Create a CMS-like object with the services
    const cms = {
      documentService,
      assetService,
      schemaTypes
    };

    // Generate GraphQL schema from CMS schema types
    const typeDefs = generateGraphQLSchema(schemaTypes);
    const resolvers = createResolvers(cms, schemaTypes);

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
*/

// Temporary stub handlers - GraphQL is disabled until infrastructure is ported
export async function GET(event: RequestEvent) {
  return new Response(JSON.stringify({
    error: 'GraphQL endpoint is temporarily disabled',
    message: 'GraphQL needs to be ported to the package or implemented as a plugin'
  }), {
    status: 503,
    headers: { 'content-type': 'application/json' }
  });
}

export async function POST(event: RequestEvent) {
  return GET(event);
}

export async function OPTIONS(event: RequestEvent) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}