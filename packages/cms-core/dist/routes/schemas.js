export const GET = async ({ url, params }) => {
    return new Response(JSON.stringify({
        message: 'Aphex CMS Schemas API - GET',
        todo: 'Move logic from src/routes/api/schemas/+server.ts'
    }), {
        headers: { 'content-type': 'application/json' }
    });
};
