<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'codeBlock';
			language?: string;
			code?: string;
		}>;
	}

	let { portableText }: Props = $props();
</script>

<figure class="codeblock">
	<div class="codeblock__bar">
		<span class="codeblock__dots"><i></i><i></i><i></i></span>
		{#if portableText.value.language}
			<span class="codeblock__lang">{portableText.value.language}</span>
		{/if}
	</div>
	<pre><code>{portableText.value.code ?? ''}</code></pre>
</figure>

<style>
	.codeblock {
		margin: 2.5rem 0;
		width: 100vw;
		max-width: 52rem;
		margin-left: 50%;
		transform: translateX(-50%);
		border-radius: 12px;
		overflow: hidden;
		background: #16140f;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 24px 50px -28px rgba(0, 0, 0, 0.5);
	}
	.codeblock__bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.codeblock__dots {
		display: inline-flex;
		gap: 0.4rem;
	}
	.codeblock__dots i {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.16);
	}
	.codeblock__lang {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}
	.codeblock pre {
		margin: 0;
		padding: 1.4rem 1.5rem;
		overflow-x: auto;
		font-size: 0.9rem;
		line-height: 1.7;
		color: #e9e3d4;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	@media (max-width: 640px) {
		.codeblock {
			width: 100%;
			margin-left: 0;
			transform: none;
			border-radius: 9px;
		}
	}
</style>
