import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			url: 'https://getaphex.com',
			title: (
				<img
					src="/images/aphex-logo.svg"
					alt="Aphex"
					width={126}
					height={40}
					className="h-8 w-auto brightness-0 dark:brightness-100"
				/>
			)
		},
		githubUrl: 'https://github.com/IcelandicIcecream/aphex',
		links: [
			{
				text: 'Documentation',
				url: '/'
			}
		]
	};
}
