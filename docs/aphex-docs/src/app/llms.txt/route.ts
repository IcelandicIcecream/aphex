import { source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
	const pages = source.getPages();

	// Group pages by their first slug segment
	const groups = new Map<string, { title: string; url: string; description?: string }[]>();

	for (const page of pages) {
		const section = page.slugs[0] ?? 'docs';
		if (!groups.has(section)) {
			groups.set(section, []);
		}
		groups.get(section)!.push({
			title: page.data.title,
			url: page.url,
			description: page.data.description
		});
	}

	const lines: string[] = ['# Aphex CMS Documentation', ''];

	for (const [section, pages] of groups) {
		const sectionTitle = section
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
		lines.push(`## ${sectionTitle}`, '');

		for (const page of pages) {
			const desc = page.description ? `: ${page.description}` : '';
			lines.push(`- [${page.title}](${page.url})${desc}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}
