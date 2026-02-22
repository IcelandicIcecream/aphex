import Link from 'next/link';

export default function HomePage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center text-center px-4">
			<div className="max-w-2xl">
				<h1 className="mb-4 text-4xl font-bold tracking-tight" style={{ fontFamily: '"placa", sans-serif', letterSpacing: '0.08em' }}>Aphex CMS</h1>
				<p className="mb-8 text-lg text-fd-muted-foreground">
					A database-agnostic, Sanity-inspired content management system built with SvelteKit.
				</p>
				<div className="flex gap-4 justify-center">
					<Link
						href="/docs"
						className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
						style={{ backgroundColor: 'oklch(0.62 0.14 39.04)' }}
					>
						Get Started
					</Link>
					<Link
						href="https://github.com/IcelandicIcecream/aphex"
						className="inline-flex items-center justify-center rounded-lg border border-fd-border px-6 py-3 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
					>
						GitHub
					</Link>
				</div>
			</div>
		</main>
	);
}
