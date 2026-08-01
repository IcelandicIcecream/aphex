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
		/* Was a hardcoded near-black, which vanished on any dark template. */
		color: var(--ink);
	}
	/* `info` is the common case and carries no warning semantics, so it takes the
	   site's accent and brands itself on whatever template renders it. `warning`
	   and `error` keep conventional amber/red defaults because the colour IS the
	   meaning — but each stays overridable per template. */
	.callout--info {
		--tone: var(--tone-info, var(--accent));
		--tone-ink: var(--tone-info-ink, var(--accent-ink));
	}
	.callout--warning {
		--tone: var(--tone-warning, #d49a2a);
		--tone-ink: var(--tone-warning-ink, #a8761a);
	}
	.callout--error {
		--tone: var(--tone-error, #c8543b);
		--tone-ink: var(--tone-error-ink, #a63f2b);
	}
</style>
