import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { MessageCircleIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';

const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

export default function Layout({ children }: LayoutProps<'/docs'>) {
	return (
		<>
			<DocsLayout tree={source.pageTree} {...baseOptions()}>
				{children}
			</DocsLayout>
			{aiEnabled && (
				<AISearch>
					<AISearchPanel />
					<AISearchTrigger
						position="float"
						className={cn(
							buttonVariants({
								color: 'secondary',
								className: 'text-fd-muted-foreground rounded-2xl'
							})
						)}
					>
						<MessageCircleIcon className="size-4.5" />
						Ask AI
					</AISearchTrigger>
				</AISearch>
			)}
		</>
	);
}
