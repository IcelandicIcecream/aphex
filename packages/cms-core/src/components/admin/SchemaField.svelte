<script lang="ts">
	import { Label } from '@aphex/ui/shadcn/label';
	import { Badge } from '@aphex/ui/shadcn/badge';
	import type { Field } from 'src/types/schemas.js';
	import {
		isFieldRequired,
		validateField,
		getValidationClasses,
		type ValidationError
	} from '../../field-validation/utils.js';

	// Import individual field components
	import StringField from './fields/StringField.svelte';
	import SlugField from './fields/SlugField.svelte';
	import TextareaField from './fields/TextareaField.svelte';
	import NumberField from './fields/NumberField.svelte';
	import BooleanField from './fields/BooleanField.svelte';
	import ImageField from './fields/ImageField.svelte';
	import ArrayField from './fields/ArrayField.svelte';
	import ReferenceField from './fields/ReferenceField.svelte';
	import SchemaField from './SchemaField.svelte';

	interface Props {
		field: Field;
		value: any;
		documentData?: Record<string, any>;
		onUpdate: (value: any) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
	}

	let { field, value, documentData, onUpdate, onOpenReference }: Props = $props();

	// Validation state for the wrapper (displays errors and status)
	let validationErrors = $state<ValidationError[]>([]);
	let hasValidated = $state(false);

	// Real-time validation for wrapper display
	async function performValidation(currentValue: any, context: any = {}) {
		console.log('Validating value:', currentValue);
		const result = await validateField(field, currentValue, context);
		validationErrors = result.errors;
		hasValidated = true;
	}

	// Validate on value change (but only after first interaction)
	$effect(() => {
		if (hasValidated) {
			performValidation(value);
		}
	});

	// Trigger validation on first interaction with complex fields
	function handleComplexFieldInteraction() {
		if (!hasValidated) {
			performValidation(value);
		}
	}

	// Validation triggers
	function handleBlur() {
		if (!hasValidated) {
			performValidation(value);
		}
	}

	function handleFocus() {
		// Could add focus styling here
	}

	// Computed values
	const hasErrors = $derived(validationErrors.filter((e) => e.level === 'error').length > 0);
	const validationClasses = $derived(getValidationClasses(hasValidated, hasErrors));
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<Label for={field.name}>
			{field.title}
			{#if isFieldRequired(field)}
				<span class="text-destructive">*</span>
			{/if}
			{#if hasValidated}
				<span class="ml-1 text-green-600">✓</span>
			{/if}
		</Label>

		<div class="flex items-center gap-2">
			{#if hasValidated && hasErrors}
				<span class="text-destructive text-sm">🚨</span>
			{/if}

			{#if field.type}
				<Badge variant="outline" class="text-xs">
					{field.type}
				</Badge>
			{/if}
		</div>
	</div>

	{#if field.description}
		<p class="text-muted-foreground text-sm">{field.description}</p>
	{/if}

	<!-- Validation errors display -->
	{#if hasValidated && validationErrors.length > 0}
		<div class="space-y-1">
			{#each validationErrors as error, index (index)}
				<p
					class="text-xs {error.level === 'error'
						? 'text-destructive'
						: error.level === 'warning'
							? 'text-orange-600'
							: 'text-blue-600'}"
				>
					{error.message}
				</p>
			{/each}
		</div>
	{/if}

	<!-- Field type routing to individual components -->
	{#if field.type === 'string'}
		<StringField
			{field}
			{value}
			{onUpdate}
			{validationClasses}
			onBlur={handleBlur}
			onFocus={handleFocus}
		/>
	{:else if field.type === 'text'}
		<TextareaField
			{field}
			{value}
			{onUpdate}
			{validationClasses}
			onBlur={handleBlur}
			onFocus={handleFocus}
		/>
	{:else if field.type === 'slug'}
		<SlugField
			{field}
			{value}
			{documentData}
			{onUpdate}
			{validationClasses}
			onBlur={handleBlur}
			onFocus={handleFocus}
		/>
	{:else if field.type === 'number'}
		<NumberField
			{field}
			{value}
			{onUpdate}
			{validationClasses}
			onBlur={handleBlur}
			onFocus={handleFocus}
		/>
	{:else if field.type === 'boolean'}
		<BooleanField {field} {value} {onUpdate} {validationClasses} onBlur={handleBlur} />

		<!-- Image Field -->
	{:else if field.type === 'image'}
		<ImageField {field} {value} {onUpdate} {validationClasses} />

		<!-- Object Field -->
	{:else if field.type === 'object' && field.fields}
		<div
			class="border-border space-y-4 rounded-md border p-4"
			onclick={handleComplexFieldInteraction}
		>
			<h4 class="text-sm font-medium">{field.title}</h4>
			{#each field.fields as subField, index (index)}
				<SchemaField
					field={subField}
					value={value?.[subField.name]}
					{documentData}
					onUpdate={(subValue) => onUpdate({ ...value, [subField.name]: subValue })}
				/>
			{/each}
		</div>

		<!-- Array Field -->
	{:else if field.type === 'array' && field.of}
		<ArrayField {field} {value} {onUpdate} {onOpenReference} />

		<!-- Reference Field -->
	{:else if field.type === 'reference' && field.to}
		<ReferenceField {field} {value} {onUpdate} {onOpenReference} />

		<!-- Unknown field type -->
	{:else}
		<div class="border-muted-foreground/30 rounded-md border border-dashed p-4 text-center">
			<p class="text-muted-foreground text-sm">
				Field type "{field.type}" not yet supported
			</p>
			<p class="text-muted-foreground mt-1 text-xs">
				Raw value: {JSON.stringify(value)}
			</p>
		</div>
	{/if}
</div>
