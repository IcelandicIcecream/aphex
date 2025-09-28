import { graphql, buildSchema } from 'graphql';

const typeDefs = `
  type Query {
    hello: String
  }
`;

const schema = buildSchema(typeDefs);

const rootValue = {
  hello: () => 'Hello World!'
};

export async function POST({ request }) {
  try {
    const { query, variables } = await request.json();

    const result = await graphql({
      schema,
      source: query,
      rootValue,
      variableValues: variables
    });

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      errors: [{ message: error.message }]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}