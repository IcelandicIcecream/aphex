<script lang="ts">
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import type { TextField } from '../../../types/schemas';

	interface Props {
		field: TextField;
		value: any;
		onUpdate: (value: any) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
		readonly?: boolean;
	}

	let {
		field,
		value,
		onUpdate,
		validationClasses,
		onBlur,
		onFocus,
		readonly = false
	}: Props = $props();

	function handleInputChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		onUpdate(target.value);
	}
</script>

<Textarea
	id={field.name}
	value={value || ''}
	placeholder={field.title}
	rows={field.rows}
	oninput={handleInputChange}
	onblur={onBlur}
	onfocus={onFocus}
	class="{field.rows ? 'field-sizing-fixed' : 'min-h-[100px]'} {validationClasses}"
	disabled={readonly}
/>
