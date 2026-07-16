<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'button';
			label?: string;
			url?: string;
			style?: string;
			align?: string;
		}>;
	}

	let { portableText }: Props = $props();

	// `style`/`align` drive class names and `url` is an href — stega markers would break
	// all three, so clean them.
	const style = $derived(stegaClean(portableText.value.style ?? 'primary'));
	const align = $derived(stegaClean(portableText.value.align ?? 'center'));
	const url = $derived(stegaClean(portableText.value.url ?? ''));
	const label = $derived(portableText.value.label ?? '');

	// Only ever emit site-internal paths or http(s) links — never `javascript:` from
	// an editor's paste. A root-relative path ("/about") is the normal way to link
	// within the site; `new URL` alone would throw on it and silently drop the button.
	// ("//host" protocol-relative is deliberately not internal — it falls through to
	// the URL parse, which rejects it.)
	const href = $derived.by(() => {
		if (!url) return null;
		if (url.startsWith('/') && !url.startsWith('//')) return url;
		try {
			const parsed = new URL(url);
			return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
		} catch {
			return null;
		}
	});

	const external = $derived(href ? !href.startsWith('/') : false);
</script>

{#if href && label}
	<div class="btn-wrap btn-wrap--{align}">
		<a
			class="btn btn--{style}"
			{href}
			rel={external ? 'noopener noreferrer' : undefined}
			target={external ? '_blank' : undefined}
		>
			{label}
		</a>
	</div>
{/if}

<style>
	.btn-wrap {
		display: flex;
		margin: 2.25rem 0;
	}
	.btn-wrap--left {
		justify-content: flex-start;
	}
	.btn-wrap--center {
		justify-content: center;
	}
	.btn-wrap--right {
		justify-content: flex-end;
	}
	.btn {
		display: inline-block;
		padding: 0.75rem 1.6rem;
		border-radius: 999px;
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
		transition: opacity 150ms ease;
	}
	.btn:hover {
		opacity: 0.88;
	}
	.btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	.btn--primary {
		background: var(--accent);
		color: var(--paper);
	}
	.btn--secondary {
		background: transparent;
		color: var(--accent-ink);
		border: 1px solid var(--rule);
	}
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none;
		}
	}
</style>
