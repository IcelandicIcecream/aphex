<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';

	interface Props {
		portableText: CustomBlockComponentProps<{ _type: 'divider'; style?: string }>;
	}

	let { portableText }: Props = $props();
	// Clean: the value drives a class name, and stega markers would invalidate it.
	const style = $derived(stegaClean(portableText.value.style ?? 'line'));
</script>

{#if style === 'dots'}
	<div class="divider divider--dots" role="separator" aria-orientation="horizontal">
		<span></span><span></span><span></span>
	</div>
{:else}
	<hr class="divider divider--line" />
{/if}

<style>
	.divider {
		margin: 3rem auto;
		border: 0;
	}
	.divider--line {
		height: 1px;
		width: 100%;
		background: var(--rule);
	}
	.divider--dots {
		display: flex;
		justify-content: center;
		gap: 0.7rem;
	}
	.divider--dots span {
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: var(--accent);
		opacity: 0.75;
	}
</style>
