import { READ_API_KEY } from '$env/static/private';

const RENDER_QUERY = `
    query MyQuery {
      allPage {
        id
        hero {
          backgroundImage {
            _type
            asset {
              _ref
              _type
            }
          }
        }
      }
    }`

export async function load({ fetch }) {
	try {
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': READ_API_KEY
			},
			body: JSON.stringify({
				query: RENDER_QUERY,
			})
		});

		const result = await response.json();

		if (result.errors) {
			console.error('GraphQL errors:', result.errors);
			return { render: null, errors: result.errors};
		}

		// Get the first newsletter from the array
		const pageRender = result.data?.allPage?.[0] || null;

		return { pageRender };
	} catch (error) {
		console.error('Failed to fetch pageRender:', error);
		return {
			render: null,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}
