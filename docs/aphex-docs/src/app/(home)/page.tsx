import Link from 'next/link';

export default function HomePage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
			<div className="max-w-2xl">
				<h1
					className="mb-4 text-4xl font-bold tracking-tight"
					style={{ fontFamily: '"placa", sans-serif', letterSpacing: '0.08em' }}
				>
					Aphex CMS
				</h1>
				<p className="text-fd-muted-foreground mb-8 text-lg">
					A database-agnostic, Sanity-inspired content management system built with SvelteKit.
				</p>
				<div className="flex justify-center gap-4">
					<Link
						href="/docs"
						className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
						style={{ backgroundColor: 'oklch(0.62 0.14 39.04)' }}
					>
						Get Started
					</Link>
					<Link
						href="https://github.com/IcelandicIcecream/aphex"
						className="border-fd-border text-fd-foreground hover:bg-fd-accent inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
					>
						GitHub
					</Link>
				</div>
			</div>
		</main>
	);
}
