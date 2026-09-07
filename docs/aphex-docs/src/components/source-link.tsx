import { cn } from '@/lib/cn';

/**
 * Links a repo-relative source path to GitHub.
 *
 * Registered globally in `mdx-components.tsx`, so MDX writes `<Src path="..." />`
 * with no import. Prefer it over a bare inline path whenever prose points at a
 * real file — a reader who wants the contract shouldn't have to go find it.
 *
 * Deliberately a *pure link*: this site is mirrored to a standalone `aphex-docs`
 * repo and built there (see `.github/workflows/sync-docs.yml`), so at build time
 * there is no `packages/` tree to check the path against. Staleness is caught in
 * the monorepo instead, by `scripts/check-doc-source-links.mjs` in CI.
 */
const REPO = 'https://github.com/IcelandicIcecream/aphex';

/** Docs describe the released surface, so links pin to `main` rather than a SHA. */
const REF = 'main';

export interface SrcProps {
	/** Repo-relative path, e.g. `packages/cms-core/src/lib/ai/interfaces/ai-provider.ts`. */
	path: string;
	/** Optional line or range to deep-link into, e.g. `42` or `42-58`. */
	lines?: string;
	/**
	 * Custom link text. Omit to show the path itself — the right default when the
	 * sentence is "here's where this lives"; pass children when the path would
	 * bury the point ("the `AIProviderAdapter` port").
	 */
	children?: React.ReactNode;
	className?: string;
}

export function Src({ path, lines, children, className }: SrcProps) {
	const clean = path.replace(/^\/+/, '');
	const hash = lines ? `#L${lines.replace('-', '-L')}` : '';

	return (
		<a
			href={`${REPO}/blob/${REF}/${clean}${hash}`}
			target="_blank"
			rel="noreferrer"
			className={cn('decoration-fd-muted-foreground/50 font-normal underline-offset-2', className)}
			title={`${clean} on GitHub`}
		>
			<code>{children ?? clean}</code>
		</a>
	);
}
