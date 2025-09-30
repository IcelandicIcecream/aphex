import { createYoga } from 'graphql-yoga';

const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello World!'
  }
};

const yoga = createYoga({
  typeDefs,
  resolvers,
  graphqlEndpoint: '/api/test-graphql'
});

export async function GET(event) {
  const response = await yoga.fetch(event.request, event);
  return response;
}

export async function POST(event) {
  const response = await yoga.fetch(event.request, event);
  return response;
}

export async function OPTIONS(event) {
  const response = await yoga.fetch(event.request, event);
  return response;
}