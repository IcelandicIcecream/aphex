<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import type { URLField } from '../../../types/schemas';

	interface Props {
		field: URLField;
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
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}
</script>

<Input
	id={field.name}
	type="url"
	value={value || ''}
	placeholder={field.placeholder || 'https://example.com'}
	oninput={handleInputChange}
	onblur={onBlur}
	onfocus={onFocus}
	class={validationClasses}
	disabled={readonly}
/>
