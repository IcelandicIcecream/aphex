<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const year = new Date().getFullYear();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;450;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="blog-shell">
	<header class="blog-header">
		<div class="blog-header__inner">
			<a href="/blog" class="blog-wordmark">
				Aphex<span class="blog-wordmark__dot">.</span>
			</a>
			<nav class="blog-nav">
				<a href="/blog">Stories</a>
				<a href="/">Home</a>
				<a href="/admin" class="blog-nav__cta">Studio</a>
			</nav>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="blog-footer">
		<div class="blog-footer__inner">
			<div class="blog-footer__brand">
				<span class="blog-wordmark blog-wordmark--sm"
					>Aphex<span class="blog-wordmark__dot">.</span></span
				>
				<p>Field notes, essays, and dispatches from the studio.</p>
			</div>
			<div class="blog-footer__meta">
				<span>© {year} Aphex Studio</span>
				<span class="blog-footer__sep">·</span>
				<a href="/admin">Powered by AphexCMS</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.blog-shell {
		--paper: #faf8f3;
		--paper-raised: #ffffff;
		--ink: #1a1813;
		--ink-soft: #6f6a60;
		--ink-faint: #9a958a;
		--rule: rgba(26, 24, 19, 0.1);
		--rule-soft: rgba(26, 24, 19, 0.06);
		--accent: #c8543b;
		--accent-ink: #a63f2b;

		--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
		--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		font-feature-settings: 'cv05', 'ss01';
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	main {
		flex: 1;
	}

	/* ---- Header ---- */
	.blog-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--paper) 82%, transparent);
		backdrop-filter: saturate(180%) blur(16px);
		border-bottom: 1px solid var(--rule-soft);
	}
	.blog-header__inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.15rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.blog-wordmark {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.4rem;
		letter-spacing: -0.02em;
		color: var(--ink);
		text-decoration: none;
	}
	.blog-wordmark--sm {
		font-size: 1.2rem;
	}
	.blog-wordmark__dot {
		color: var(--accent);
	}
	.blog-nav {
		display: flex;
		align-items: center;
		gap: 1.9rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.blog-nav a {
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.blog-nav a:hover {
		color: var(--ink);
	}
	.blog-nav__cta {
		color: var(--ink) !important;
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.4rem 0.95rem;
		transition:
			border-color 0.18s ease,
			background 0.18s ease;
	}
	.blog-nav__cta:hover {
		background: var(--ink);
		color: var(--paper) !important;
		border-color: var(--ink);
	}

	/* ---- Footer ---- */
	.blog-footer {
		margin-top: 6rem;
		border-top: 1px solid var(--rule-soft);
	}
	.blog-footer__inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 2rem;
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: flex-end;
		justify-content: space-between;
	}
	.blog-footer__brand p {
		margin: 0.55rem 0 0;
		max-width: 24rem;
		color: var(--ink-soft);
		font-size: 0.92rem;
		line-height: 1.6;
	}
	.blog-footer__meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		color: var(--ink-faint);
	}
	.blog-footer__meta a {
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.blog-footer__meta a:hover {
		color: var(--accent-ink);
	}
	.blog-footer__sep {
		opacity: 0.5;
	}

	@media (max-width: 640px) {
		.blog-header__inner,
		.blog-footer__inner {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.blog-nav {
			gap: 1.1rem;
		}
	}
</style>
