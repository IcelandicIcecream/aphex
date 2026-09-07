<script lang="ts">
	import { Image } from '@aphexcms/cms-core/image';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const count = $derived(data.pages.length);

	// `_meta.updatedAt` arrives as a Date over SvelteKit's devalue transport, but a
	// hand-built value could just as easily be a string — accept both rather than
	// asserting one away.
	function formatDate(value: Date | string | null | undefined) {
		if (!value) return null;
		return new Date(value).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{count === 0 ? 'Aphex' : 'Pages'}</title>
</svelte:head>

<main>
	<!--
		Two states, and the empty one matters more: it is what every new install
		shows at minute zero, before any content exists. It is written to get you
		into the studio and back out again, not to apologise for being empty.
	-->
	{#if count === 0}
		<section class="intro">
			<div class="intro__lead">
				<h1>Your CMS and your site<br />are the same app.</h1>
				<p class="lede">
					This page is server-rendered from the Local API — no HTTP round-trip, no separate frontend
					to deploy. Publish something and it appears here.
				</p>
			</div>

			<ol class="steps">
				<li>
					<span class="steps__n">01</span>
					<div>
						<h2>Open the studio</h2>
						<p>
							<a href="/admin">/admin</a> — the first account you create becomes super admin.
						</p>
					</div>
				</li>
				<li>
					<span class="steps__n">02</span>
					<div>
						<h2>Create a page</h2>
						<p>Give it a title and a body, then hit publish.</p>
					</div>
				</li>
				<li>
					<span class="steps__n">03</span>
					<div>
						<h2>Come back here</h2>
						<p>
							It will be listed below. The query lives in <code
								>src/routes/(site)/+page.server.ts</code
							>.
						</p>
					</div>
				</li>
			</ol>

			<p class="footnote">
				Define your own content in <code>src/lib/schemaTypes/</code>. The
				<code>page</code> schema is one example — delete it once you have your own.
			</p>
		</section>
	{:else}
		<section class="intro intro--list">
			<div class="intro__lead">
				<h1>Pages</h1>
				<p class="lede">
					Read from the CMS via the Local API in <code>src/routes/(site)/+page.server.ts</code>.
				</p>
			</div>
			<p class="tally">{count} published</p>
		</section>

		<!--
			A list with hairline rules rather than a grid of cards: these are
			documents, and a card implies a boundary the content does not have.
		-->
		<ul class="pages">
			{#each data.pages as page (page.id)}
				<li>
					{#if page.coverImage?.asset?.url}
						<!-- Small fixed thumbnail: the list is for choosing what to read, and a
						     full-width image per row turns scanning into scrolling. `sizes` tells
						     the browser the slot is 120px so it picks that rung instead of the
						     largest candidate. Decorative here — the title beside it is the link. -->
						<a class="pages__thumb" href="/{page.slug}" tabindex="-1" aria-hidden="true">
							<Image value={page.coverImage} alt="" sizes="120px" />
						</a>
					{/if}
					<!-- All the text in one wrapper: the row is then exactly two grid
					     children, so nothing can auto-flow back under the thumbnail. -->
					<div class="pages__text">
						<div class="pages__head">
							<h2>
								{#if page.slug}
									<a href="/{page.slug}">{page.title ?? 'Untitled'}</a>
								{:else}
									{page.title ?? 'Untitled'}
								{/if}
							</h2>
							{#if page.slug}<span class="pages__slug">/{page.slug}</span>{/if}
						</div>
						{#if page.excerpt}
							<p class="pages__body">{page.excerpt}</p>
						{/if}
						{#if formatDate(page._meta?.updatedAt)}
							<p class="pages__meta">Updated {formatDate(page._meta?.updatedAt)}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<footer>
		<a href="/admin">Open the studio →</a>
	</footer>
</main>

<style>
	/* Tokens and page paint live in (site)/+layout.svelte — shared by every
	   public route. */
	main {
		max-width: 78rem;
		margin: 0 auto;
		padding: clamp(4rem, 9vw, 8rem) var(--gutter) 4rem;
	}

	/* Asymmetric, left-aligned. A centred hero over a grid is the single most
	   recognisable generated-page silhouette. */
	.intro {
		display: grid;
		gap: clamp(2.5rem, 5vw, 5rem);
		padding-bottom: clamp(2.5rem, 5vw, 4rem);
		border-bottom: 1px solid var(--line);
	}
	@media (min-width: 60rem) {
		.intro {
			grid-template-columns: 46% 1fr;
			align-items: start;
		}
		/* The list header is a heading and a count, not two columns of content —
		   46%/1fr strands the tally mid-page. Size the second column to its text
		   and push it to the right edge instead. */
		.intro--list {
			grid-template-columns: 1fr auto;
			align-items: baseline;
		}
	}

	h1 {
		margin: 0;
		font-size: clamp(2.5rem, 5.2vw, 4.5rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.92;
		text-wrap: balance;
	}

	.lede {
		max-width: 34rem;
		margin: 1.75rem 0 0;
		color: var(--smoke);
		font-size: clamp(1rem, 1.3vw, 1.125rem);
		line-height: 1.55;
	}

	/* Numerals in mono, sized as data rather than decoration. */
	.steps {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 1.75rem;
	}
	.steps li {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 1rem;
		align-items: baseline;
	}
	.steps__n {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--mist);
	}
	.steps h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.steps p {
		margin: 0.35rem 0 0;
		color: var(--smoke);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.tally {
		margin: 0;
		text-align: right;
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--mist);
	}

	.pages {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.pages li {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
		padding: clamp(1.75rem, 3vw, 2.5rem) 0;
		border-bottom: 1px solid var(--line);
	}
	/* Thumbnail only once there's room beside the text; below that the row is
	   text-only rather than stacking an image above every entry. Square so rows
	   keep a uniform height whatever shape the source is. */
	.pages__thumb {
		display: none;
	}
	@media (min-width: 40rem) {
		.pages li:has(.pages__thumb) {
			grid-template-columns: 120px 1fr;
			align-items: center;
		}
		.pages__thumb {
			display: block;
			aspect-ratio: 1;
			overflow: hidden;
			border: 1px solid var(--line);
			border-radius: 2px;
		}
		.pages__thumb :global(img) {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.pages__head {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		flex-wrap: wrap;
	}
	.pages h2 {
		margin: 0;
		font-size: clamp(1.35rem, 2.2vw, 1.85rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.15;
	}
	.pages h2 a {
		text-decoration: none;
	}
	.pages h2 a:hover {
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-underline-offset: 0.15em;
	}
	/* Metadata set as text. A pill around a slug is decoration pretending to be
	   information. */
	.pages__slug {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--mist);
	}
	.pages__body {
		max-width: 42rem;
		margin: 0.75rem 0 0;
		color: var(--smoke);
		line-height: 1.6;
	}
	.pages__meta {
		margin: 0.75rem 0 0;
		font-family: var(--mono);
		font-size: 0.7rem;
		color: var(--mist);
	}

	.footnote {
		max-width: 34rem;
		margin: 0;
		color: var(--mist);
		font-size: 0.85rem;
		line-height: 1.55;
	}

	code {
		font-family: var(--mono);
		font-size: 0.85em;
		color: var(--ink);
	}

	/* The text stays ink on hover and the underline does the work. Swapping a whole
	   word to a saturated orange is loud and reads as unconsidered — the accent is
	   a 1.5px detail here, not the content. */
	a {
		color: var(--ink);
		text-decoration-line: underline;
		text-decoration-color: color-mix(in srgb, var(--ink) 25%, transparent);
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1.5px;
		transition: text-decoration-color 120ms ease;
	}
	a:hover {
		text-decoration-color: var(--accent);
	}

	footer {
		margin-top: clamp(3rem, 6vw, 5rem);
		padding-top: 1.5rem;
	}
	footer a {
		font-family: var(--mono);
		font-size: 0.8rem;
		text-decoration: none;
		color: var(--smoke);
		transition: color 120ms ease;
	}
	footer a:hover {
		color: var(--ink);
	}
</style>
