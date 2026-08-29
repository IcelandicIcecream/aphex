<script lang="ts">
	import { Image } from '@aphexcms/cms-core/image';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Item = PageData['items'][number];

	/**
	 * The widths the browser is actually offered, read back out of the srcset.
	 *
	 * Parsed rather than recomputed from config: the point of this page is to
	 * show what was served, and a locally-recomputed ladder would agree with
	 * itself even when the pipeline disagreed.
	 */
	function candidates(srcset: string | undefined): { url: string; width: number }[] {
		if (!srcset) return [];
		return srcset
			.split(',')
			.map((part) => part.trim().split(/\s+/))
			.flatMap(([url, descriptor]) =>
				url && descriptor?.endsWith('w') ? [{ url, width: Number(descriptor.slice(0, -1)) }] : []
			);
	}

	function bytes(n: number | undefined | null): string {
		if (n === undefined || n === null) return '—';
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / 1024 / 1024).toFixed(2)} MB`;
	}

	/**
	 * The asset whose ladder is broken out in full.
	 *
	 * Left unset initially and chosen in the effect below rather than seeded from
	 * `data` here, which would capture only the first load's value and quietly
	 * keep showing a stale asset after a client-side navigation.
	 */
	let featured = $state<Item | undefined>();

	interface Rung {
		width: number;
		url: string;
		/** Measured, not assumed — see `measure`. */
		bytes?: number;
		naturalWidth?: number;
		naturalHeight?: number;
		ms?: number;
		error?: string;
	}

	let rungs = $state<Rung[]>([]);
	let measuring = $state(false);

	/**
	 * Fetch every rung and record what actually came back.
	 *
	 * Deliberately a real request per rung rather than reading the sizes out of
	 * the asset's stored variant record. Two reasons: the record only exists
	 * *after* generation, so reading it would show nothing on a fresh asset; and
	 * fetching is what proves generate-on-miss works — the first run is slow
	 * because these files are being produced right now, the second is fast
	 * because they aren't.
	 */
	async function measure(item: Item) {
		featured = item;
		syncUrl(item.id);
		measuring = true;
		const list = candidates(item.value.asset?.srcset);
		rungs = list.map((c) => ({ width: c.width, url: c.url }));

		await Promise.all(
			rungs.map(async (rung, i) => {
				const started = performance.now();
				try {
					const response = await fetch(rung.url);
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					const blob = await response.blob();
					const ms = Math.round(performance.now() - started);
					const bitmap = await createImageBitmap(blob);
					rungs[i] = {
						...rung,
						bytes: blob.size,
						ms,
						naturalWidth: bitmap.width,
						naturalHeight: bitmap.height
					};
					bitmap.close();
				} catch (error) {
					rungs[i] = {
						...rung,
						error: error instanceof Error ? error.message : 'failed'
					};
				}
			})
		);
		measuring = false;
	}

	/**
	 * Reflect the selection in `?id=`, so the page is linkable and survives a
	 * reload.
	 *
	 * `replaceState`, not `pushState`: clicking through a library of thumbnails
	 * would otherwise stack a history entry per click and make the back button
	 * useless for leaving the page.
	 */
	function syncUrl(id: string) {
		const next = new URL(page.url);
		if (next.searchParams.get('id') === id) return;
		next.searchParams.set('id', id);
		replaceState(next, page.state);
	}

	$effect(() => {
		if (featured) return;
		const requested = data.requestedId
			? data.items.find((i) => i.id === data.requestedId)
			: undefined;
		const first = requested ?? data.items.find((i) => i.value.asset?.srcset);
		if (first) measure(first);
	});

	/**
	 * Container width the responsive preview renders at, in CSS pixels.
	 *
	 * `sizes` is declared to match, so moving this changes which rung the browser
	 * picks — which is the whole lesson: the ladder is global, the choice is
	 * per-placement.
	 */
	let containerWidth = $state(640);
	let dpr = $state(1);
	$effect(() => {
		dpr = window.devicePixelRatio;
	});

	/**
	 * Direct upload needs all four preconditions, and reporting only the
	 * conjunction makes a misconfiguration undiagnosable — which is exactly the
	 * confusion "I set direct: true and it still says off" describes.
	 */
	const preconditionLabels: Record<keyof PageData['directUpload'], string> = {
		configured: 'upload.direct in aphex.config.ts',
		adapterCanSign: 'adapter getSignedUploadUrl()',
		adapterCanResolvePath: 'adapter resolvePath()',
		encryptionKey: 'APHEX_SECRET_ENCRYPTION_KEY'
	};

	const missingPreconditions = $derived(
		Object.entries(data.directUpload)
			.filter(([, ok]) => !ok)
			.map(([key]) => preconditionLabels[key as keyof PageData['directUpload']])
	);
	const directUploadOn = $derived(missingPreconditions.length === 0);

	/**
	 * Click-to-copy for identifiers.
	 *
	 * The asset id is the one thing on this page you actually need elsewhere —
	 * it's what a document's `{ asset: { _ref } }` holds, what every storage key
	 * is derived from, and what you paste into a query. Selecting a UUID by hand
	 * out of a URL is exactly the friction worth removing.
	 */
	let copied = $state<string | null>(null);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = text;
			setTimeout(() => {
				if (copied === text) copied = null;
			}, 1600);
		} catch {
			// Clipboard access can be refused (insecure context, denied permission).
			// The value is still on screen and selectable, so this is not worth an
			// error state — it just doesn't confirm.
		}
	}

	const originalBytes = $derived(featured?.bytes ?? 0);
	const totalLadderBytes = $derived(rungs.reduce((sum, r) => sum + (r.bytes ?? 0), 0));
	const largest = $derived(rungs.reduce((max, r) => Math.max(max, r.bytes ?? 0), 0));
</script>

<svelte:head>
	<title>Image Lab</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="lab">
	<header class="head">
		<p class="kicker">Aphex DAM</p>
		<h1>Image Lab</h1>
		<p class="lede">
			Every image below is rendered by <code>&lt;Image&gt;</code> from a srcset built by
			<code>injectAssetUrls</code>. Nothing on this page constructs a URL by hand — it goes through
			the same path a real page does.
		</p>

		<dl class="stats">
			<div>
				<dt>Width ladder</dt>
				<dd>{data.imageConfig?.widths?.join(' · ') ?? '320 · 640 · 960 · 1280 · 1920'}</dd>
			</div>
			<div>
				<dt>Quality</dt>
				<dd>{data.imageConfig?.quality ?? 80} <span class="dim">webp</span></dd>
			</div>
			<div>
				<dt>Storage</dt>
				<dd>{data.storageAdapter}</dd>
			</div>
			<div>
				<dt>Direct upload</dt>
				<dd class={directUploadOn ? 'ok' : 'warn-text'}>
					{directUploadOn ? 'on' : 'off'}
					{#if !directUploadOn}
						<span class="dim">&mdash; missing {missingPreconditions.join(', ')}</span>
					{/if}
				</dd>
			</div>
			<div>
				<dt>Your DPR</dt>
				<dd>{dpr}&times;</dd>
			</div>
		</dl>
	</header>

	{#if featured}
		<section class="panel">
			<div class="panel-head">
				<h2>The ladder, in full</h2>
				<p class="sub">
					Every derivative of <strong>{featured.filename}</strong>, fetched for real. Pixel
					dimensions are read off the decoded image; byte counts are the response bodies. The
					original is
					<strong>{bytes(originalBytes)}</strong> at
					{featured.value.asset?.width}&times;{featured.value.asset?.height}.
				</p>

				<dl class="ids">
					<div>
						<dt>Asset ID</dt>
						<dd>
							<button class="copy" onclick={() => copy(featured!.id)} title="Copy asset ID">
								<code>{featured.id}</code>
								<span class="copy-state">{copied === featured.id ? 'copied' : 'copy'}</span>
							</button>
						</dd>
					</div>
					<div>
						<dt>Original</dt>
						<dd>
							<button
								class="copy"
								onclick={() => copy(featured!.value.asset?.url ?? '')}
								title="Copy original URL"
							>
								<code>{featured.value.asset?.url}</code>
								<span class="copy-state"
									>{copied === featured.value.asset?.url ? 'copied' : 'copy'}</span
								>
							</button>
						</dd>
					</div>
					<div>
						<dt>Storage key</dt>
						<dd><code class="plain">{featured.id}/original.…</code></dd>
					</div>
					<div>
						<dt>Deep link</dt>
						<dd>
							<button
								class="copy"
								onclick={() => copy(new URL(`?id=${featured!.id}`, page.url).href)}
								title="Copy a link to this asset's breakdown"
							>
								<code>?id={featured.id.slice(0, 8)}…</code>
								<span class="copy-state"
									>{copied === new URL(`?id=${featured.id}`, page.url).href
										? 'copied'
										: 'copy'}</span
								>
							</button>
						</dd>
					</div>
				</dl>
			</div>

			<div class="ladder">
				{#each rungs as rung (rung.url)}
					<figure class="rung">
						<div class="rung-img">
							<img src={rung.url} alt="" loading="lazy" />
						</div>
						<figcaption>
							<div class="rung-title">
								<span class="tag">{rung.width}w</span>
								{#if rung.error}
									<span class="err">{rung.error}</span>
								{:else}
									<span class="dim"
										>{rung.naturalWidth ?? '…'}&times;{rung.naturalHeight ?? '…'}</span
									>
								{/if}
							</div>

							<div class="bar" aria-hidden="true">
								<span style="width: {largest ? ((rung.bytes ?? 0) / largest) * 100 : 0}%"></span>
							</div>

							<div class="rung-figs">
								<strong>{bytes(rung.bytes)}</strong>
								{#if rung.bytes && originalBytes}
									<span class="dim">
										{((rung.bytes / originalBytes) * 100).toFixed(1)}% of original
									</span>
									<span class="save">
										&minus;{(100 - (rung.bytes / originalBytes) * 100).toFixed(1)}%
									</span>
								{/if}
								{#if rung.ms !== undefined}
									<span class="dim">{rung.ms} ms</span>
								{/if}
							</div>
						</figcaption>
					</figure>
				{/each}
			</div>

			{#if rungs.length && totalLadderBytes}
				<p class="summary">
					All {rungs.length} derivatives together are
					<strong>{bytes(totalLadderBytes)}</strong>
					— {(totalLadderBytes / originalBytes).toFixed(2)}&times; the original, while the largest
					single rung a browser will ever pick is
					<strong>{bytes(largest)}</strong>, or
					<strong>{((largest / originalBytes) * 100).toFixed(1)}%</strong> of it.
				</p>
				<p class="summary dim">
					Run it again with the network tab open: the first pass generated these on the fly, the
					second serves them from storage. That's generate-on-miss — no build step, no backfill, and
					changing <code>quality</code> in <code>aphex.config.ts</code> changes every URL, so nothing
					stale can be served.
				</p>
			{:else if measuring}
				<p class="summary dim">Generating derivatives…</p>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-head">
				<h2>Which rung does the browser pick?</h2>
				<p class="sub">
					Drag to resize the container. <code>sizes</code> is declared to match it, so the browser
					re-picks a candidate as it changes. At {containerWidth}px on a {dpr}&times; screen it
					wants about <strong>{containerWidth * dpr}px</strong> and takes the smallest rung that covers
					it.
				</p>
			</div>

			<label class="slider">
				<input type="range" min="160" max="1200" step="20" bind:value={containerWidth} />
				<span class="tag">{containerWidth}px</span>
			</label>

			<div class="preview" style="width: {containerWidth}px">
				<Image value={featured.value} sizes="{containerWidth}px" alt={featured.filename} />
			</div>
		</section>
	{/if}

	<section class="panel">
		<div class="panel-head">
			<h2>Library</h2>
			<p class="sub">
				{data.items.length} image{data.items.length === 1 ? '' : 's'} in this organization. Click one
				to break down its ladder above.
			</p>
		</div>

		<div class="grid">
			{#each data.items as item (item.id)}
				{@const list = candidates(item.value.asset?.srcset)}
				<button
					class="card"
					class:active={featured?.id === item.id}
					onclick={() => measure(item)}
					disabled={list.length === 0}
				>
					<div class="card-img">
						<!-- 200px tiles: `sizes` keeps the browser off the big rungs. -->
						<Image value={item.value} sizes="220px" alt={item.filename} />
					</div>
					<div class="card-meta">
						<span class="name">{item.filename}</span>
						<span class="dim">
							{item.value.asset?.width ?? '?'}&times;{item.value.asset?.height ?? '?'} ·
							{bytes(item.bytes)}
						</span>
						<code class="plain id">{item.id}</code>
						{#if list.length}
							<span class="tag sm">{list.length} rungs</span>
						{:else if item.pages > 1}
							<span class="tag sm warn">animated · {item.pages} frames</span>
						{:else if item.mimeType === 'image/svg+xml'}
							<span class="tag sm warn">svg · vector</span>
						{:else}
							<span class="tag sm warn">original only</span>
						{/if}
					</div>
				</button>
			{:else}
				<p class="sub">No image assets yet. Upload one in /admin.</p>
			{/each}
		</div>
	</section>
</div>

<style>
	/*
	 * One explicit palette, deliberately not theme-aware.
	 *
	 * This page renders inside the site layout, which commits to its own light
	 * chrome. A `prefers-color-scheme: dark` block here fires on a dark-mode OS
	 * while the surrounding page stays light — dark panels and light text
	 * stranded on a white background, which is exactly what it did. Following the
	 * host's chrome is the only safe answer, and the host is light.
	 */
	.lab {
		--bg: #ffffff;
		--panel: #f7f7f8;
		--line: #e4e4e7;
		--text: #18181b;
		--dim: #52525b;
		--accent: #2563eb;
		--good: #15803d;

		max-width: 76rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 6rem;
		background: var(--bg);
		color: var(--text);
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			sans-serif;
	}

	.kicker {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}

	h1 {
		margin: 0.25rem 0 0.5rem;
		font-size: 2.25rem;
		letter-spacing: -0.02em;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
		letter-spacing: -0.01em;
	}

	.lede,
	.sub {
		color: var(--dim);
		max-width: 68ch;
		line-height: 1.6;
	}

	.lede {
		margin: 0 0 1.75rem;
	}

	.sub {
		margin: 0.35rem 0 0;
		font-size: 0.875rem;
	}

	.dim {
		color: var(--dim);
	}
	.ok {
		color: var(--good);
	}
	.save {
		color: var(--good);
		font-variant-numeric: tabular-nums;
	}
	.warn-text {
		color: #b45309;
	}
	.err {
		color: #b91c1c;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.85em;
		background: var(--panel);
		border: 1px solid var(--line);
		padding: 0.08em 0.35em;
		border-radius: 4px;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 2.25rem;
		margin: 0;
		padding: 1.1rem 1.25rem;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
	}

	.stats div {
		margin: 0;
	}

	dt {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--dim);
	}

	dd {
		margin: 0.2rem 0 0;
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		/* Explicit: the surrounding site sets its own colors, and an inherited
		   one here is how the stats bar rendered as invisible text. */
		color: var(--text);
	}

	.lab :where(h1, h2, strong) {
		color: var(--text);
	}

	.panel {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--line);
	}

	.panel-head {
		margin-bottom: 1.5rem;
	}

	/* --- ladder --- */

	.ladder {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1.25rem;
		align-items: end;
	}

	.rung {
		margin: 0;
	}

	.rung-img {
		background: repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}

	.rung-img img {
		display: block;
		width: 100%;
		height: auto;
	}

	figcaption {
		margin-top: 0.6rem;
	}

	.rung-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.tag {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: var(--accent);
		color: #fff;
		font-size: 0.72rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.tag.sm {
		background: transparent;
		color: var(--dim);
		border: 1px solid var(--line);
		font-weight: 500;
	}

	.tag.warn {
		color: #92400e;
		border-color: #fde68a;
		background: #fffbeb;
	}

	/* Bytes are the point of this page, so they get a shape as well as a number —
	   the ratio between rungs is much easier to read than five figures. */
	.bar {
		height: 4px;
		margin: 0.4rem 0;
		background: var(--line);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.3s ease;
	}

	.rung-figs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
	}

	.ids {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem 2.25rem;
		margin: 1rem 0 0;
	}

	.ids div {
		margin: 0;
		min-width: 0;
	}

	.ids dd {
		margin-top: 0.25rem;
	}

	.copy {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--panel);
		font: inherit;
		color: inherit;
		cursor: pointer;
		max-width: 100%;
	}

	.copy:hover {
		border-color: var(--accent);
	}

	.copy code {
		background: none;
		border: none;
		padding: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.copy-state {
		flex: none;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--dim);
	}

	code.plain {
		background: none;
		border: none;
		padding: 0;
		color: var(--dim);
	}

	code.id {
		font-size: 0.68rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.summary {
		margin: 1.5rem 0 0;
		font-size: 0.9rem;
		line-height: 1.65;
		max-width: 68ch;
	}

	/* --- responsive preview --- */

	.slider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.slider input {
		width: min(100%, 28rem);
	}

	.preview {
		max-width: 100%;
	}

	.preview :global(img) {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--panel);
	}

	/* --- library --- */

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.card {
		display: block;
		text-align: left;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--bg);
		cursor: pointer;
		overflow: hidden;
		font: inherit;
		color: inherit;
		transition:
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.card:hover:not(:disabled) {
		border-color: var(--accent);
		transform: translateY(-2px);
	}

	.card.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}

	.card:disabled {
		cursor: default;
		opacity: 0.65;
	}

	.card-img {
		aspect-ratio: 4 / 3;
		background: var(--panel);
	}

	.card-img :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.7rem 0.8rem 0.85rem;
		font-size: 0.78rem;
	}

	.name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-meta .tag {
		align-self: flex-start;
		margin-top: 0.15rem;
	}
</style>
