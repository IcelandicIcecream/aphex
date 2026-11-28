<script lang="ts">
	import { X } from '@lucide/svelte';
	import { cn } from '@aphexcms/ui/utils';

	/**
	 * A list of short strings as chips in one box (`options.layout: 'tags'` on an
	 * array of strings): type, then Enter or a comma, and it's added. Backspace in
	 * the empty box takes the last one off. Pasting a comma- or line-separated list
	 * adds each. Stored as a plain string array, the same as the list layout.
	 */
	let {
		value,
		onUpdate,
		placeholder = 'Type, then press Enter',
		readonly = false,
		id
	}: {
		value: string[];
		onUpdate: (value: string[]) => void;
		placeholder?: string;
		readonly?: boolean;
		id?: string;
	} = $props();

	let draft = $state('');

	function add(text: string) {
		const next = [...value];
		for (const part of text.split(/[,\n]/)) {
			const tag = part.trim();
			if (tag && !next.includes(tag)) next.push(tag);
		}
		draft = '';
		if (next.length !== value.length) onUpdate(next);
	}

	function remove(index: number) {
		onUpdate(value.filter((_, i) => i !== index));
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			add(draft);
		} else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
			remove(value.length - 1);
		}
	}
</script>

<div
	class={cn(
		'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 shadow-xs focus-within:ring-[3px]',
		readonly && 'pointer-events-none opacity-50'
	)}
>
	{#each value as tag, index (tag)}
		<span
			class="bg-muted text-foreground inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-sm"
		>
			{tag}
			{#if !readonly}
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground rounded-sm"
					aria-label="Remove {tag}"
					onclick={() => remove(index)}
				>
					<X class="size-3.5" />
				</button>
			{/if}
		</span>
	{/each}
	<input
		{id}
		class="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
		placeholder={value.length ? '' : placeholder}
		bind:value={draft}
		disabled={readonly}
		{onkeydown}
		onblur={() => draft.trim() && add(draft)}
		onpaste={(event) => {
			const text = event.clipboardData?.getData('text') ?? '';
			if (/[,\n]/.test(text)) {
				event.preventDefault();
				add(text);
			}
		}}
	/>
</div>
