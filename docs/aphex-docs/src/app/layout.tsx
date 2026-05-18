import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
	subsets: ['latin']
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		template: '%s — Aphex Docs · SvelteKit CMS',
		default: 'Aphex Docs — The Open-Source SvelteKit CMS'
	},
	description:
		'Documentation for Aphex, the open-source Svelte CMS. Schema-driven, TypeScript-first, Sanity-style headless CMS for SvelteKit with Postgres.',
	keywords: [
		'Aphex CMS',
		'Svelte CMS',
		'SvelteKit CMS',
		'headless CMS',
		'open source CMS',
		'Sanity alternative',
		'TypeScript CMS',
		'Postgres CMS',
		'Svelte 5 CMS'
	],
	openGraph: {
		type: 'website',
		siteName: 'Aphex Docs',
		url: SITE_URL,
		title: 'Aphex Docs — The Open-Source SvelteKit CMS',
		description:
			'Documentation for Aphex, the open-source Svelte CMS. Schema-driven, TypeScript-first, Sanity-style headless CMS for SvelteKit.'
	},
	twitter: {
		card: 'summary_large_image'
	},
	alternates: {
		canonical: SITE_URL
	}
};

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<head>
				<link rel="stylesheet" href="https://use.typekit.net/wkv0kmj.css" />
			</head>
			<body className="flex min-h-screen flex-col">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
