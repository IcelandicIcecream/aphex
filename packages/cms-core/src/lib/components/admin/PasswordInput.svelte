<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Eye, EyeOff } from '@lucide/svelte';

	/**
	 * A password field with a show/hide toggle. Core copy of the app's input so
	 * the admin's auth panels (change password, 2FA, delete account) carry their
	 * own control rather than depending on an app component.
	 *
	 * Props come from `HTMLInputAttributes`, not `ComponentProps<typeof Input>`:
	 * Input's props are a union discriminated on `type` (`'file'` vs the rest), and
	 * a `type` that varies at runtime can't select a branch — so the non-file half
	 * is spelled out here, the only half a password field could ever be.
	 */
	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;
	type Props = Omit<HTMLInputAttributes, 'type' | 'value' | 'files'> & {
		value: string;
	};

	let { value = $bindable(''), class: className = '', ...rest }: Props = $props();

	let visible = $state(false);
	const type: InputType = $derived(visible ? 'text' : 'password');
</script>

<div class="relative">
	<Input {...rest} {type} bind:value class="pr-10 {className}" />
	<button
		type="button"
		class="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-0 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
		onclick={() => (visible = !visible)}
		disabled={rest.disabled}
		aria-label={visible ? 'Hide password' : 'Show password'}
		aria-pressed={visible}
	>
		{#if visible}
			<EyeOff class="h-4 w-4" />
		{:else}
			<Eye class="h-4 w-4" />
		{/if}
	</button>
</div>
