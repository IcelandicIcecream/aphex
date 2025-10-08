<script lang="ts">
	import { Textarea } from '@aphex/ui/shadcn/textarea';
	import type { Field } from 'src/types/schemas.js';

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
		const target = event.target as HTMLTextAreaElement;
		onUpdate(target.value);
	}
</script>

<Textarea
	id={field.name}
	value={value || ''}
	placeholder={field.title}
	oninput={handleInputChange}
	onblur={onBlur}
	onfocus={onFocus}
	class="min-h-[100px] {validationClasses}"
/>
