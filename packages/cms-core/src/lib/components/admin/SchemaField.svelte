<script lang="ts">
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Alert from '@aphexcms/ui/shadcn/alert';
	import type {
		Field,
		DateField as DateFieldType,
		DateTimeField as DateTimeFieldType
	} from '../../types/schemas';
	import {
		isFieldRequired,
		validateField,
		getValidationClasses,
		type ValidationError
	} from '../../field-validation/utils';
	import { cmsLogger } from '../../utils/logger';
	import { useFieldComponents } from '../../admin/field-components.svelte';
	import {
		convertDateToUserFormat,
		convertDateTimeToUserFormat
	} from '../../field-validation/date-utils';

	// Leaf/reference/custom-input fields resolve through the shared FieldInput;
	// object/array containers recurse here.
	import FieldInput from './fields/FieldInput.svelte';
	import ArrayField from './fields/ArrayField.svelte';
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
		organizationId?: string; // Document's organization ID for asset uploads
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
		readonly = false,
		organizationId
	}: Props = $props();

	// Build full field path
	const fieldPath = $derived(parentPath ? `${parentPath}.${field.name}` : field.name);

	// Plugin-provided input widget for this field's `input` key, if any. When set,
	// it replaces the built-in renderer for the field's type.
	const fieldComponents = useFieldComponents();
	const CustomInput = $derived(field.input ? fieldComponents(field.input) : undefined);

	// Validation state for the wrapper (displays errors and status)
	let validationErrors = $state<ValidationError[]>([]);

	// Real-time validation for wrapper display
	export async function performValidation(currentValue: any, context: any = {}) {
		validationErrors = []; // Clear previous errors

		cmsLogger.debug(
			'[SchemaField.performValidation]',
			`Field "${field.name}" type="${field.type}"`,
			{
				currentValue,
				context
			}
		);

		// Convert date/datetime values from ISO to user format for validation
		let valueForValidation = currentValue;
		if (field.type === 'date' && currentValue && typeof currentValue === 'string') {
			const dateField = field as DateFieldType;
			const userFormat = dateField.options?.dateFormat || 'YYYY-MM-DD';
			cmsLogger.debug('[SchemaField.performValidation]', `Converting DATE field "${field.name}"`, {
				currentValue,
				userFormat
			});
			valueForValidation = convertDateToUserFormat(currentValue, userFormat);
			cmsLogger.debug('[SchemaField.performValidation]', `DATE converted`, {
				valueForValidation
			});
		} else if (field.type === 'datetime' && currentValue && typeof currentValue === 'string') {
			const dateTimeField = field as DateTimeFieldType;
			const dateFormat = dateTimeField.options?.dateFormat || 'YYYY-MM-DD';
			const timeFormat = dateTimeField.options?.timeFormat || 'HH:mm';
			cmsLogger.debug(
				'[SchemaField.performValidation]',
				`Converting DATETIME field "${field.name}"`,
				{
					currentValue,
					dateFormat,
					timeFormat
				}
			);
			valueForValidation = convertDateTimeToUserFormat(currentValue, dateFormat, timeFormat);
			cmsLogger.debug('[SchemaField.performValidation]', `DATETIME converted`, {
				valueForValidation
			});
		}

		const result = await validateField(field, valueForValidation, context);
		cmsLogger.debug('[SchemaField.performValidation]', `Validation result for "${field.name}"`, {
			errors: result.errors
		});
		validationErrors = result.errors;
	}

	// Computed values
	const hasErrors = $derived(validationErrors.filter((e) => e.level === 'error').length > 0);
	const validationClasses = $derived(getValidationClasses(hasErrors));
</script>

<div class="space-y-2" data-field-path={fieldPath}>
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
	<svelte:boundary
		onerror={(error) =>
			cmsLogger.error(
				'[SchemaField]',
				`Error rendering field "${field.name}" (${field.type}):`,
				error
			)}
	>
		{#if field.type === 'object' && field.fields && !CustomInput}
			<!-- Object container: recurse. A custom `input` widget would override this. -->
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
						{organizationId}
					/>
				{/each}
			</div>
		{:else if field.type === 'array' && field.of && !CustomInput}
			<!-- Array container (also the block-content editor when `of` has {type:'block'}). -->
			<ArrayField {field} {value} {onUpdate} {onOpenReference} {readonly} {organizationId} />
		{:else}
			<!-- Leaf / reference / custom-input fields — resolved uniformly. -->
			<FieldInput
				{field}
				{value}
				{onUpdate}
				{readonly}
				{validationClasses}
				{documentData}
				{schemaType}
				{fieldPath}
				{organizationId}
				{onOpenReference}
			/>
		{/if}

		{#snippet failed(error, reset)}
			<div class="border-destructive/30 bg-destructive/5 rounded-md border p-3">
				<p class="text-destructive text-sm font-medium">
					Failed to render field "{field.name}" ({field.type})
				</p>
				<p class="text-muted-foreground mt-1 text-xs">
					{error instanceof Error ? error.message : 'Unknown error'}
				</p>
				<button class="text-primary mt-2 text-xs underline" onclick={reset}> Try again </button>
			</div>
		{/snippet}
	</svelte:boundary>
</div>
