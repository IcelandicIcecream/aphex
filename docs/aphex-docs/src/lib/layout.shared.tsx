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
			title: (
				<>
					<img
						src="/images/aphex-lightmode.png"
						alt="Aphex"
						width={30}
						height={30}
						className="block dark:hidden"
					/>
					<img
						src="/images/aphex-darkmode.png"
						alt="Aphex"
						width={30}
						height={30}
						className="hidden dark:block"
					/>
				</>
			)
		},
		githubUrl: 'https://github.com/IcelandicIcecream/aphex',
		links: [
			{
				text: 'Documentation',
				url: '/docs'
			}
		]
	};
}
