import { getPageImage, source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { PageActions } from '@/components/page-actions';

const GITHUB_OWNER = 'IcelandicIcecream';
const GITHUB_REPO = 'aphex';
const GITHUB_BRANCH = 'main';
const CONTENT_PATH = 'docs/aphex-docs/content/docs';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	const MDX = page.data.body;
	const markdown = await page.data.getText('processed');
	const pageUrl = `${SITE_URL}${page.url}`;

	return (
		<DocsPage
			toc={page.data.toc}
			full={page.data.full}
			tableOfContent={{
				style: 'clerk',
				header: (
					<PageActions markdown={markdown} pageUrl={pageUrl} slugs={page.slugs} />
				)
			}}
			lastUpdate={page.data.lastModified}
			editOnGithub={{
				owner: GITHUB_OWNER,
				repo: GITHUB_REPO,
				sha: GITHUB_BRANCH,
				path: `${CONTENT_PATH}/${page.path}`
			}}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				<MDX
					components={getMDXComponents({
						// this allows you to link to other pages with relative file paths
						a: createRelativeLink(source, page)
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			images: getPageImage(page).url
		}
	};
}
