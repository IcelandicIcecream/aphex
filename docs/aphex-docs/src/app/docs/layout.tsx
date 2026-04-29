import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';

const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

export default function Layout({ children }: LayoutProps<'/docs'>) {
	if (!aiEnabled) {
		return (
			<DocsLayout tree={source.pageTree} {...baseOptions()}>
				{children}
			</DocsLayout>
		);
	}

	return (
		<AISearch>
			<DocsLayout tree={source.pageTree} {...baseOptions()}>
				{children}
				<AISearchTrigger
					position="float"
					className="rounded-full border bg-fd-secondary px-4 py-2 text-sm font-medium text-fd-secondary-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
				>
					Ask AI
				</AISearchTrigger>
				<AISearchPanel />
			</DocsLayout>
		</AISearch>
	);
}
