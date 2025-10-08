<script lang="ts">
	import { Label } from '@aphex/ui/shadcn/label';
	import type { Field } from 'src/types/schemas.js';

	interface Props {
		field: Field;
		value: any;
		onUpdate: (value: any) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
	}

	let { field, value, onUpdate, validationClasses, onBlur }: Props = $props();

	function handleBooleanChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.checked);
	}
</script>

<div class="flex items-center space-x-2">
	<input
		id={field.name}
		type="checkbox"
		checked={value || false}
		onchange={handleBooleanChange}
		onblur={onBlur}
		class="border-input h-4 w-4 rounded border {validationClasses}"
	/>
	<Label for={field.name} class="text-sm font-normal">
		{field.title}
	</Label>
</div>
