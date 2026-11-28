import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Banner } from 'fumadocs-ui/components/banner';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import type { Metadata } from 'next';

const GA_MEASUREMENT_ID = 'G-SMRP12N1P4';

const inter = Inter({
	subsets: ['latin']
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.getaphex.com';

// `next` on the deployment of the experimental build's docs (the `next` branch of the
// docs mirror): a banner says so, and search engines are kept off it so they only list
// the stable docs.
const IS_NEXT = process.env.NEXT_PUBLIC_DOCS_CHANNEL === 'next';
const STABLE_URL = 'https://docs.getaphex.com';

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
	},
	...(IS_NEXT ? { robots: { index: false, follow: false } } : {})
};

export default function Layout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<head>
				<link rel="stylesheet" href="https://use.typekit.net/wkv0kmj.css" />
			</head>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					{IS_NEXT ? (
						<Banner id="next-docs">
							<span>
								Docs for the experimental build (<code>@next</code>).{' '}
								<a href="/whats-new" className="underline">
									What’s new in Aphex 2
								</a>
								. For the stable release, see{' '}
								<a href={STABLE_URL} className="underline">
									docs.getaphex.com
								</a>
								.
							</span>
						</Banner>
					) : (
						<Banner id="aphex-2">
							<span>
								Aphex 2 is here.{' '}
								<a href="/whats-new" className="underline">
									See what’s new
								</a>
							</span>
						</Banner>
					)}
					{children}
				</RootProvider>

				{/* Google Analytics (gtag.js) */}
				<Script
					src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
					strategy="afterInteractive"
				/>
				<Script id="gtag-init" strategy="afterInteractive">
					{`
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', '${GA_MEASUREMENT_ID}');
					`}
				</Script>
			</body>
		</html>
	);
}
