<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';

	interface Props {
		portableText: CustomBlockComponentProps<{ _type: 'callout'; tone?: string; text?: string }>;
	}

	let { portableText }: Props = $props();

	// `tone` drives a CSS class name and `=== 'warning'` checks below. In preview the
	// value carries invisible stega markers, which would make `callout--{tone}` an
	// invalid class (styling silently drops) and break the equality checks — so clean it.
	const tone = $derived(stegaClean(portableText.value.tone ?? 'info'));
	const label = $derived(tone === 'warning' ? 'Heads up' : tone === 'error' ? 'Important' : 'Note');
</script>

<aside class="callout callout--{tone}">
	<span class="callout__label">{label}</span>
	<p>{portableText.value.text ?? ''}</p>
</aside>

<style>
	.callout {
		margin: 2.5rem 0;
		padding: 1.4rem 1.6rem;
		border-radius: 12px;
		border: 1px solid var(--rule);
		background: var(--paper-raised);
		position: relative;
		overflow: hidden;
	}
	.callout::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--tone, var(--accent));
	}
	.callout__label {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--tone-ink, var(--accent-ink));
		margin-bottom: 0.4rem;
	}
	.callout p {
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.6;
		color: #2a271f;
	}
	.callout--info {
		--tone: #3b7dc8;
		--tone-ink: #2d63a3;
	}
	.callout--warning {
		--tone: #d49a2a;
		--tone-ink: #a8761a;
	}
	.callout--error {
		--tone: #c8543b;
		--tone-ink: #a63f2b;
	}
</style>
