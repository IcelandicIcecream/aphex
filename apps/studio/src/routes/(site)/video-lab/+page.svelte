<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * What the browser itself reports once it has the metadata. This is the half
	 * the server cannot tell you: duration and real pixel dimensions live in the
	 * container, not in any column, and whether the codec is actually playable is
	 * a property of this browser rather than of the file.
	 */
	let clientInfo = $state<Record<string, string>>({});
	let videoEl = $state<HTMLVideoElement | null>(null);

	function readClientInfo() {
		if (!videoEl) return;
		const total = videoEl.duration;
		clientInfo = {
			duration: Number.isFinite(total) ? `${total.toFixed(2)}s` : 'unknown',
			dimensions: `${videoEl.videoWidth} × ${videoEl.videoHeight}`,
			readyState: String(videoEl.readyState),
			// Non-empty `seekable` is the observable proof that ranges work: with a
			// 200-only server the browser has nothing to seek within until the whole
			// file has arrived.
			seekable: videoEl.seekable.length
				? `${videoEl.seekable.start(0).toFixed(1)}–${videoEl.seekable.end(0).toFixed(1)}s`
				: 'none',
			canPlayType: videoEl.canPlayType(data.selected?.mimeType ?? '') || 'no'
		};
	}

	// Built here rather than as an inline array literal in the template: a
	// `[[label, probe], ...]` literal widens to `string | Probe`, so every field
	// access below became a type error on the string half of the union.
	const probes = $derived([
		{ label: 'No Range header', probe: data.probes.full },
		{ label: 'Range: bytes=0-1023', probe: data.probes.ranged },
		{ label: 'Range: bytes=-500 (suffix)', probe: data.probes.suffix },
		{ label: 'Range: bytes=999999999- (past end)', probe: data.probes.past }
	]);

	function bytes(value: number | string | null | undefined) {
		const n = typeof value === 'string' ? Number(value) : value;
		if (n == null || !Number.isFinite(n)) return '—';
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
		return `${(n / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<div class="lab">
	<h1>Video lab</h1>
	<p class="sub">
		The delivery path for self-hosted video, reported rather than demonstrated. Server answers on
		the left, what this browser makes of them on the right.
	</p>

	{#if !data.selected}
		<p class="empty">No video assets yet — upload one in the media browser.</p>
	{:else}
		{#if data.assets.length > 1}
			<nav class="picker">
				{#each data.assets as asset (asset.id)}
					<a href="?id={asset.id}" class:active={asset.id === data.selected.id}>
						{asset.originalFilename}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="grid">
			<section>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoEl}
					src={data.playbackUrl}
					controls
					playsinline
					preload="metadata"
					onloadedmetadata={readClientInfo}
					ondurationchange={readClientInfo}
				></video>

				<h2>Asset</h2>
				<dl>
					<dt>Filename</dt>
					<dd>{data.selected.originalFilename}</dd>
					<dt>MIME type</dt>
					<dd><code>{data.selected.mimeType}</code></dd>
					<dt>Size</dt>
					<dd>{bytes(data.selected.size)}</dd>
					<dt>Stored dimensions</dt>
					<dd>
						{data.selected.width && data.selected.height
							? `${data.selected.width} × ${data.selected.height}`
							: 'none — not extracted for video'}
					</dd>
					<dt>URL</dt>
					<dd><code class="break">{data.playbackUrl}</code></dd>
				</dl>

				<h2>Browser reports</h2>
				<dl>
					{#each Object.entries(clientInfo) as [key, value] (key)}
						<dt>{key}</dt>
						<dd><code>{value}</code></dd>
					{:else}
						<dd class="muted">Waiting for metadata…</dd>
					{/each}
				</dl>
			</section>

			<section>
				<h2>Server responses</h2>
				<p class="note">
					A player seeks by asking for byte ranges. Without <code>206</code> support the browser can only
					reach the middle of a file by transferring everything before it — which small files on localhost
					hide completely.
				</p>

				{#each probes as { label, probe } (label)}
					<div class="probe">
						<h3>{label}</h3>
						{#if !probe}
							<p class="muted">not run</p>
						{:else if 'error' in probe && probe.error}
							<p class="bad">{probe.error}</p>
						{:else}
							<dl>
								<dt>Status</dt>
								<dd>
									<code
										class:good={probe.status === 206 || probe.status === 200}
										class:warn={probe.status === 416}>{probe.status}</code
									>
								</dd>
								<dt>Content-Length</dt>
								<dd><code>{bytes(probe.contentLength)}</code></dd>
								{#if probe.contentRange}
									<dt>Content-Range</dt>
									<dd><code>{probe.contentRange}</code></dd>
								{/if}
								<dt>Accept-Ranges</dt>
								<dd><code>{probe.acceptRanges ?? '—'}</code></dd>
								<dt>Cache-Control</dt>
								<dd><code class="break">{probe.cacheControl ?? '—'}</code></dd>
							</dl>
						{/if}
					</div>
				{/each}
			</section>
		</div>
	{/if}
</div>

<style>
	.lab {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}
	h1 {
		margin: 0 0 0.25rem;
	}
	.sub,
	.note {
		opacity: 0.7;
		font-size: 0.9rem;
		margin: 0 0 1.5rem;
	}
	.picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.picker a {
		font-size: 0.8rem;
		padding: 0.25rem 0.6rem;
		border: 1px solid currentColor;
		border-radius: 999px;
		opacity: 0.5;
		text-decoration: none;
		color: inherit;
	}
	.picker a.active {
		opacity: 1;
	}
	.grid {
		display: grid;
		gap: 2.5rem;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		align-items: start;
	}
	video {
		width: 100%;
		border-radius: 0.5rem;
		background: #000;
		margin-bottom: 1.5rem;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.55;
		margin: 1.5rem 0 0.5rem;
	}
	h3 {
		font-size: 0.8rem;
		margin: 0 0 0.4rem;
	}
	dl {
		display: grid;
		grid-template-columns: minmax(0, 10rem) minmax(0, 1fr);
		gap: 0.3rem 1rem;
		margin: 0;
		font-size: 0.85rem;
	}
	dt {
		opacity: 0.6;
	}
	dd {
		margin: 0;
		min-width: 0;
	}
	code {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
	}
	code.break {
		overflow-wrap: anywhere;
	}
	.good {
		color: #16a34a;
	}
	.warn {
		color: #ca8a04;
	}
	.bad {
		color: #dc2626;
	}
	.muted {
		opacity: 0.5;
	}
	.probe {
		padding: 0.75rem 0;
		border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
	}
	.empty {
		opacity: 0.6;
	}
</style>
