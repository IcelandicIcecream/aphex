'use client';

import { useState } from 'react';
import { Check, Copy, ChevronDown, ExternalLink, FileText } from 'lucide-react';

interface PageActionsProps {
	/** Raw processed markdown for the current page. */
	markdown: string;
	/** Absolute URL of the current page (used to build AI links). */
	pageUrl: string;
	/** Slug array — used to build the `/llms.mdx/<slug>` view link. */
	slugs: string[];
}

/**
 * Dropdown of "LLM-friendly" page actions mounted in the DocsPage TOC slot.
 *
 * - Copy Markdown: copies the processed MDX/markdown to clipboard
 * - View as Markdown: opens the `/llms.mdx/<slug>` route
 * - Open in ChatGPT / Claude: deep-links to the AI with the page URL prefilled
 */
export function PageActions({ markdown, pageUrl, slugs }: PageActionsProps) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const viewUrl = `/llms.mdx/${slugs.join('/')}`;
	const prompt = `Read ${pageUrl} so I can ask questions about it.`;
	const chatgptUrl = `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`;
	const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

	async function copyMarkdown() {
		try {
			await navigator.clipboard.writeText(markdown);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard denied — fall through silently.
		}
	}

	return (
		<div className="not-prose relative mb-4 flex items-stretch">
			<button
				type="button"
				onClick={copyMarkdown}
				className="border-fd-border bg-fd-card text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex items-center gap-2 rounded-l-md border px-3 py-1.5 text-sm transition-colors"
				aria-label="Copy page as Markdown"
			>
				{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
				<span>{copied ? 'Copied' : 'Copy page'}</span>
			</button>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="border-fd-border bg-fd-card text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex items-center rounded-r-md border border-l-0 px-2 py-1.5 transition-colors"
				aria-label="Open page actions menu"
				aria-haspopup="menu"
				aria-expanded={open}
			>
				<ChevronDown className="size-4" />
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
					<div
						role="menu"
						className="border-fd-border bg-fd-popover text-fd-popover-foreground absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden rounded-md border text-sm shadow-lg"
					>
						<MenuItem onClick={copyMarkdown}>
							{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
							<div>
								<div className="font-medium">Copy as Markdown</div>
								<div className="text-fd-muted-foreground text-xs">
									Copy the full page to paste into an LLM
								</div>
							</div>
						</MenuItem>
						<MenuLink href={viewUrl} target="_blank" icon={<FileText className="size-4" />}>
							<div className="font-medium">View as Markdown</div>
							<div className="text-fd-muted-foreground text-xs">
								Open the raw .mdx for this page
							</div>
						</MenuLink>
						<MenuLink
							href={chatgptUrl}
							target="_blank"
							rel="noreferrer"
							icon={<ExternalLink className="size-4" />}
						>
							<div className="font-medium">Open in ChatGPT</div>
							<div className="text-fd-muted-foreground text-xs">Ask ChatGPT about this page</div>
						</MenuLink>
						<MenuLink
							href={claudeUrl}
							target="_blank"
							rel="noreferrer"
							icon={<ExternalLink className="size-4" />}
						>
							<div className="font-medium">Open in Claude</div>
							<div className="text-fd-muted-foreground text-xs">Ask Claude about this page</div>
						</MenuLink>
					</div>
				</>
			)}
		</div>
	);
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			className="hover:bg-fd-accent hover:text-fd-accent-foreground flex w-full items-start gap-3 px-3 py-2 text-left"
		>
			{children}
		</button>
	);
}

function MenuLink({
	children,
	icon,
	...anchorProps
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { icon: React.ReactNode }) {
	return (
		<a
			role="menuitem"
			{...anchorProps}
			className="hover:bg-fd-accent hover:text-fd-accent-foreground flex w-full items-start gap-3 px-3 py-2 text-left"
		>
			{icon}
			<div className="flex-1">{children}</div>
		</a>
	);
}
