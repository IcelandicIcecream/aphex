<script lang="ts">
	/**
	 * The `code` block, with a copy button.
	 *
	 * No syntax highlighter: one would be a client-side dependency several times
	 * the size of everything else on the page, and this is a starter. The
	 * `language` is rendered as a label and set on the `<code>` element's class,
	 * which is the hook a highlighter (Shiki, Prism) reads if you add one.
	 */
	import { control } from '$lib/utils/stega';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	type CodeValue = { language?: string; code?: string };

	let { portableText }: { portableText: CustomBlockComponentProps<CodeValue> } = $props();

	const value = $derived(portableText.value);
	// The code body is copied to the clipboard and the language becomes a class
	// name — neither should carry preview markers.
	const code = $derived(control(value?.code));
	const language = $derived(control(value?.language) ?? 'text');
	let copied = $state(false);

	async function copy() {
		if (!code) return;
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard access is denied in some contexts (an insecure origin, a
			// permissions policy). Failing quietly is better than an alert here —
			// the code is still selectable.
		}
	}
</script>

{#if code}
	<figure class="bg-muted/50 my-8 overflow-hidden rounded-lg border">
		<figcaption
			class="text-muted-foreground flex items-center justify-between border-b px-4 py-2 text-xs"
		>
			<span>{language}</span>
			<button
				type="button"
				onclick={copy}
				class="hover:bg-muted hover:text-foreground cursor-pointer rounded px-2 py-0.5"
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
		</figcaption>
		<pre class="overflow-x-auto p-4 text-sm leading-relaxed"><code class="language-{language}"
				>{code}</code
			></pre>
	</figure>
{/if}
