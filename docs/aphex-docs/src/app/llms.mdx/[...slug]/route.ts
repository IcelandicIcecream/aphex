import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET(_req: Request, props: { params: Promise<{ slug: string[] }> }) {
	const params = await props.params;
	const page = source.getPage(params.slug);

	if (!page) {
		return new Response('Not found', { status: 404 });
	}

	const text = await getLLMText(page);

	return new Response(text, {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
	});
}

export async function generateStaticParams() {
	return source.generateParams();
}
