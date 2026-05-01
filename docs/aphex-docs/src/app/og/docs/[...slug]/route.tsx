import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;

// Aphex palette mirrored as hex so Satori (which doesn't yet support
// oklch in all builds) renders consistently across providers.
const colors = {
	background: '#16181f',
	foreground: '#f0eee2',
	muted: '#9d9788',
	accent: '#f0a04d',
	border: '#2c2f3a'
};

// Load the dark-mode (white) logo once at module load and inline as a
// data URL — Satori needs the bytes available at render time, and OG
// routes are SSG so we can't rely on a runtime fetch to /images/.
const logoBytes = readFileSync(
	join(process.cwd(), 'public/images/aphex-darkmode.png')
);
const logoDataUrl = `data:image/png;base64,${logoBytes.toString('base64')}`;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
	const { slug } = await params;
	const page = source.getPage(slug.slice(0, -1));
	if (!page) notFound();

	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '72px',
					background: colors.background,
					color: colors.foreground,
					fontFamily: 'sans-serif'
				}}
			>
				{/* Top row: book icon left, logo right */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}}
				>
					{/* Book icon (lucide BookOpen, inline SVG so Satori can render it) */}
					<svg
						width="56"
						height="56"
						viewBox="0 0 24 24"
						fill="none"
						stroke={colors.accent}
						strokeWidth="1.75"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 7v14" />
						<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
					</svg>

					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={logoDataUrl} alt="" width={160} height={40} />
				</div>

				{/* Middle: title + description */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
					<div
						style={{
							fontSize: '76px',
							fontWeight: 700,
							lineHeight: 1.05,
							letterSpacing: '-0.03em',
							color: colors.foreground,
							maxWidth: '1000px'
						}}
					>
						{page.data.title}
					</div>
					{page.data.description && (
						<div
							style={{
								fontSize: '32px',
								lineHeight: 1.35,
								color: colors.muted,
								maxWidth: '960px'
							}}
						>
							{page.data.description}
						</div>
					)}
				</div>

				{/* Bottom: just the docs URL */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						paddingTop: '28px',
						borderTop: `1px solid ${colors.border}`
					}}
				>
					<div style={{ fontSize: '22px', color: colors.muted }}>docs.getaphex.com</div>
				</div>
			</div>
		),
		{
			width: 1200,
			height: 630
		}
	);
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		lang: page.locale,
		slug: getPageImage(page).segments
	}));
}
