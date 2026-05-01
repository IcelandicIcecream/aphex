import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	async redirects() {
		return [
			// Docs moved from /docs/* to /* — preserve old inbound links and SEO.
			{ source: '/docs', destination: '/', permanent: true },
			{ source: '/docs/:slug*', destination: '/:slug*', permanent: true }
		];
	}
};

export default withMDX(config);
