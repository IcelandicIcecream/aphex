<script lang="ts">
	import { Input } from '@aphex/ui/shadcn/input';
	import { Button } from '@aphex/ui/shadcn/button';
	import type { Field } from '../../../types/schemas.js';
	import { generateSlug } from '../../../utils/index.js';

	interface Props {
		field: Field;
		value: any;
		documentData?: Record<string, any>;
		onUpdate: (value: any) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
	}

	let { field, value, documentData, onUpdate, validationClasses, onBlur, onFocus }: Props =
		$props();

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
		/>
		<Button
			variant="outline"
			size="sm"
			onclick={generateSlugFromTitle}
			disabled={!documentData?.title}
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
