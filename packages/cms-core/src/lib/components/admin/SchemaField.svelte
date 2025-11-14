<script lang="ts">
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Alert from '@aphexcms/ui/shadcn/alert';
	import type { Field } from 'src/types/schemas.js';
	import {
		isFieldRequired,
		validateField,
		getValidationClasses,
		type ValidationError
	} from '../../field-validation/utils';

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
		doValidation?: () => void;
		schemaType?: string; // Document type
		parentPath?: string; // Parent field path for nested fields
		readonly?: boolean; // Read-only mode for viewers
	}

	let {
		field,
		value,
		documentData,
		onUpdate,
		onOpenReference,
		doValidation,
		schemaType,
		parentPath,
		readonly = false
	}: Props = $props();

	// Build full field path
	const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;

	// Validation state for the wrapper (displays errors and status)
	let validationErrors = $state<ValidationError[]>([]);

	// Real-time validation for wrapper display
	export async function performValidation(currentValue: any, context: any = {}) {
		validationErrors = []; // Clear previous errors
		const result = await validateField(field, currentValue, context);
		validationErrors = result.errors;
	}
	// Computed values
	const hasErrors = $derived(validationErrors.filter((e) => e.level === 'error').length > 0);
	const validationClasses = $derived(getValidationClasses(hasErrors));
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<Label for={field.name}>
			{field.title}
			{#if isFieldRequired(field)}
				<span class="text-destructive">*</span>
			{/if}
		</Label>

		<div class="flex items-center gap-2">
			{#if hasErrors}
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
	{#if validationErrors.length > 0}
		<div class="space-y-2">
			{#each validationErrors as error, index (index)}
				<Alert.Root
					variant={error.level === 'error'
						? 'destructive'
						: error.level === 'warning'
							? 'default'
							: 'default'}
				>
					<Alert.Description class="text-xs">
						{error.message}
					</Alert.Description>
				</Alert.Root>
			{/each}
		</div>
	{/if}

	<!-- Field type routing to individual components -->
	{#if field.type === 'string'}
		<StringField {field} {value} {documentData} {onUpdate} {validationClasses} {readonly} />
	{:else if field.type === 'text'}
		<TextareaField {field} {value} {onUpdate} {validationClasses} {readonly} />
	{:else if field.type === 'slug'}
		<SlugField {field} {value} {documentData} {onUpdate} {validationClasses} {readonly} />
	{:else if field.type === 'number'}
		<NumberField {field} {value} {onUpdate} {validationClasses} {readonly} />
	{:else if field.type === 'boolean'}
		<BooleanField {field} {value} {onUpdate} {validationClasses} {readonly} />

		<!-- Image Field -->
	{:else if field.type === 'image'}
		<ImageField
			{field}
			{value}
			{onUpdate}
			{validationClasses}
			{schemaType}
			{fieldPath}
			{readonly}
		/>

		<!-- Object Field -->
	{:else if field.type === 'object' && field.fields}
		<div class="border-border space-y-4 rounded-md border p-4">
			<h4 class="text-sm font-medium">{field.title}</h4>
			{#each field.fields as subField, index (index)}
				<SchemaField
					field={subField}
					value={value?.[subField.name]}
					{documentData}
					onUpdate={(subValue) => onUpdate({ ...value, [subField.name]: subValue })}
					{doValidation}
					{schemaType}
					parentPath={fieldPath}
					{readonly}
				/>
			{/each}
		</div>

		<!-- Array Field -->
	{:else if field.type === 'array' && field.of}
		<ArrayField {field} {value} {onUpdate} {onOpenReference} {readonly} />

		<!-- Reference Field -->
	{:else if field.type === 'reference' && field.to}
		<ReferenceField {field} {value} {onUpdate} {onOpenReference} {readonly} />

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
