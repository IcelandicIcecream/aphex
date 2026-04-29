import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { source } from '@/lib/source';
import { Document, type DocumentData } from 'flexsearch';

interface CustomDocument extends DocumentData {
	url: string;
	title: string;
	description: string;
	content: string;
}

export type ChatUIMessage = UIMessage<
	never,
	{
		client: {
			location: string;
		};
	}
>;

const searchServer = createSearchServer();

async function createSearchServer() {
	const search = new Document<CustomDocument>({
		document: {
			id: 'url',
			index: ['title', 'description', 'content'],
			store: true
		}
	});

	const docs = await chunkedAll(
		source.getPages().map(async (page) => {
			if (!('getText' in page.data)) return null;

			return {
				title: page.data.title,
				description: page.data.description,
				url: page.url,
				content: await page.data.getText('processed')
			} as CustomDocument;
		})
	);

	for (const doc of docs) {
		if (doc) search.add(doc);
	}

	return search;
}

async function chunkedAll<O>(promises: Promise<O>[]): Promise<O[]> {
	const SIZE = 50;
	const out: O[] = [];
	for (let i = 0; i < promises.length; i += SIZE) {
		out.push(...(await Promise.all(promises.slice(i, i + SIZE))));
	}
	return out;
}

/** System prompt — tweak if you want different tone or stricter grounding. */
const systemPrompt = [
	'You are an AI assistant for the AphexCMS documentation site.',
	'Use the `search` tool to retrieve relevant docs context before answering when needed.',
	'The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.',
	'If you cannot find the answer in the search results, say you do not know and suggest a better query.'
].join('\n');

export async function POST(req: Request) {
	// Gracefully degrade when the key isn't configured — the layout already
	// hides the trigger in that case, so this is a defense-in-depth check.
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return new Response(
			JSON.stringify({
				error: 'Ask AI is not configured. Set OPENAI_API_KEY in your environment to enable it.'
			}),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const openai = createOpenAI({ apiKey });
	const reqJson = await req.json();

	const result = streamText({
		model: openai.chat(process.env.OPENAI_MODEL ?? 'gpt-4o-mini'),
		stopWhen: stepCountIs(5),
		tools: {
			search: searchTool
		},
		messages: [
			{ role: 'system', content: systemPrompt },
			...(await convertToModelMessages<ChatUIMessage>(reqJson.messages ?? [], {
				convertDataPart(part) {
					if (part.type === 'data-client')
						return {
							type: 'text',
							text: `[Client Context: ${JSON.stringify(part.data)}]`
						};
				}
			}))
		],
		toolChoice: 'auto'
	});

	return result.toUIMessageStreamResponse();
}

export type SearchTool = typeof searchTool;

const searchTool = tool({
	description: 'Search the docs content and return raw JSON results.',
	inputSchema: z.object({
		query: z.string(),
		limit: z.number().int().min(1).max(100).default(10)
	}),
	async execute({ query, limit }) {
		const search = await searchServer;
		return await search.searchAsync(query, { limit, merge: true, enrich: true });
	}
});
