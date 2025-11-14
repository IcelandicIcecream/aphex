<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { SlugField } from '../../../types/schemas';
	import { generateSlug } from '../../../utils/index';

	interface Props {
		field: SlugField;
		value: any;
		documentData?: Record<string, any>;
		onUpdate: (value: any) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
		readonly?: boolean;
	}

	let {
		field,
		value,
		documentData,
		onUpdate,
		validationClasses,
		onBlur,
		onFocus,
		readonly = false
	}: Props = $props();

	// Get the source field name (default to 'title' for backwards compatibility)
	const sourceField = $derived(field.source || 'title');

	// Get the source value from document data
	const sourceValue = $derived(documentData?.[sourceField]);

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}

	// Generate slug from source field
	function generateSlugFromSource() {
		if (sourceValue && typeof sourceValue === 'string') {
			const generatedSlug = generateSlug(sourceValue);
			onUpdate(generatedSlug);
		}
	}
</script>

<div class="space-y-2">
	<div class="flex gap-2">
		<Input
			id={field.name}
			value={value || ''}
			placeholder="document-slug"
			oninput={handleInputChange}
			onblur={onBlur}
			onfocus={onFocus}
			class="flex-1 {validationClasses}"
			disabled={readonly}
		/>
		<Button
			variant="outline"
			size="sm"
			onclick={generateSlugFromSource}
			disabled={!sourceValue || readonly}
			class="shrink-0"
		>
			Generate
		</Button>
	</div>
	{#if sourceValue}
		<p class="text-muted-foreground text-xs">
			Click "Generate" to create slug from {sourceField}: "{sourceValue}"
		</p>
	{:else if field.source}
		<p class="text-muted-foreground text-xs">
			Enter a {sourceField} first to generate a slug automatically
		</p>
	{:else}
		<p class="text-muted-foreground text-xs">
			Click "Generate" or enter a custom slug
		</p>
	{/if}
</div>
