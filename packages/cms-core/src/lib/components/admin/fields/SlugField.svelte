<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { Field } from '../../../types/schemas';
	import { generateSlug } from '../../../utils/index';

	interface Props {
		field: Field;
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

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}

	// Generate slug from title
	function generateSlugFromTitle() {
		if (documentData?.title) {
			const generatedSlug = generateSlug(documentData.title);
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
			onclick={generateSlugFromTitle}
			disabled={!documentData?.title || readonly}
			class="shrink-0"
		>
			Generate from Title
		</Button>
	</div>
	{#if documentData?.title}
		<p class="text-muted-foreground text-xs">
			Click "Generate from Title" to create slug from: "{documentData.title}"
		</p>
	{:else}
		<p class="text-muted-foreground text-xs">
			Enter a title first to generate a slug automatically
		</p>
	{/if}
</div>
