<script lang="ts">
	import { Input } from '@aphex/ui/shadcn/input';
	import type { Field } from '../../../types/schemas.js';

	interface Props {
		field: Field;
		value: any;
		onUpdate: (value: any) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
	}

	let { field, value, onUpdate, validationClasses, onBlur, onFocus }: Props = $props();

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}
</script>

<Input
	id={field.name}
	value={value || ''}
	placeholder={field.title}
	oninput={handleInputChange}
	onblur={onBlur}
	onfocus={onFocus}
	class={validationClasses}
/>
