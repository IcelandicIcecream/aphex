<script lang="ts">
	// The shared input resolver: given a field, pick the right control — a plugin
	// widget (field.input → aphex/field/component) first, else the built-in renderer
	// for the field type. Used by SchemaField (for leaf/reference fields) AND by
	// ArrayField (per primitive/reference item), so a custom or rich input resolves
	// uniformly everywhere, the way Sanity's form builder does — no array-item gap.
	//
	// Object and array containers are NOT handled here; those recurse through
	// SchemaField / ArrayField, which fall back to this component for their leaves.
	import type { Field } from '../../../types/schemas';
	import { useFieldComponents } from '../../../admin/field-components.svelte';
	import StringField from './StringField.svelte';
	import TextareaField from './TextareaField.svelte';
	import NumberField from './NumberField.svelte';
	import BooleanField from './BooleanField.svelte';
	import SlugField from './SlugField.svelte';
	import URLField from './URLField.svelte';
	import DateField from './DateField.svelte';
	import DateTimeField from './DateTimeField.svelte';
	import ImageField from './ImageField.svelte';
	import FileField from './FileField.svelte';
	import ReferenceField from './ReferenceField.svelte';

	interface Props {
		field: Field;
		value: any;
		onUpdate: (value: any) => void;
		readonly?: boolean;
		validationClasses?: string;
		documentData?: Record<string, any>;
		schemaType?: string;
		fieldPath?: string;
		organizationId?: string;
		onOpenReference?: (documentId: string, documentType: string) => void;
	}

	let {
		field,
		value,
		onUpdate,
		readonly = false,
		validationClasses,
		documentData,
		schemaType,
		fieldPath,
		organizationId,
		onOpenReference
	}: Props = $props();

	const fieldComponents = useFieldComponents();
	const CustomInput = $derived(field.input ? fieldComponents(field.input) : undefined);
</script>

{#if CustomInput}
	<CustomInput
		{field}
		{value}
		{onUpdate}
		{validationClasses}
		{readonly}
		{documentData}
		{schemaType}
	/>
{:else if field.type === 'string'}
	<StringField {field} {value} {documentData} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'text'}
	<TextareaField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'slug'}
	<SlugField {field} {value} {documentData} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'url'}
	<URLField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'number'}
	<NumberField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'boolean'}
	<BooleanField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'date'}
	<DateField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'datetime'}
	<DateTimeField {field} {value} {onUpdate} {validationClasses} {readonly} />
{:else if field.type === 'image'}
	<ImageField
		{field}
		{value}
		{onUpdate}
		{validationClasses}
		{schemaType}
		{fieldPath}
		{readonly}
		{organizationId}
	/>
{:else if field.type === 'file'}
	<FileField
		{field}
		{value}
		{onUpdate}
		{validationClasses}
		{schemaType}
		{fieldPath}
		{readonly}
		{organizationId}
	/>
{:else if field.type === 'reference' && field.to}
	<ReferenceField {field} {value} {onUpdate} {onOpenReference} {readonly} />
{:else}
	<div class="border-muted-foreground/30 rounded-md border border-dashed p-4 text-center">
		<p class="text-muted-foreground text-sm">Field type "{field.type}" not yet supported</p>
		<p class="text-muted-foreground mt-1 text-xs">Raw value: {JSON.stringify(value)}</p>
	</div>
{/if}
