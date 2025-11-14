<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import * as RadioGroup from '@aphexcms/ui/shadcn/radio-group';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import type { StringField, DependentList } from '../../../types/schemas';

	interface Props {
		field: StringField;
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

	// Check if list is a dependent list
	function isDependentList(list: any): list is DependentList {
		return list && typeof list === 'object' && 'dependsOn' in list && 'options' in list;
	}

	// Resolve the actual list items (either static or dependent)
	const resolvedList = $derived(() => {
		if (!field.list) return [];

		if (Array.isArray(field.list)) {
			// Static list
			return field.list;
		} else if (isDependentList(field.list)) {
			// Dependent list - get options based on dependsOn field value
			const dependentValue = documentData?.[field.list.dependsOn];
			if (!dependentValue) return [];
			return field.list.options[dependentValue] || [];
		}

		return [];
	});

	// Check if this is a dependent field that's missing its dependency
	const isDependentFieldWithoutValue = $derived(() => {
		if (!field.list) return false;
		if (Array.isArray(field.list)) return false;
		if (isDependentList(field.list)) {
			const dependentValue = documentData?.[field.list.dependsOn];
			return !dependentValue;
		}
		return false;
	});

	// Get the name of the field this depends on (for display)
	const dependsOnFieldName = $derived(() => {
		if (field.list && isDependentList(field.list)) {
			return field.list.dependsOn;
		}
		return '';
	});

	// Normalize list items to { title, value } format
	const listItems = $derived(
		resolvedList().map((item) =>
			typeof item === 'string' ? { title: item.toUpperCase(), value: item } : item
		)
	);

	const layout = $derived(field.options?.layout || 'dropdown');
	const direction = $derived(field.options?.direction || 'vertical');

	// For Select component - derive trigger content
	const selectedItem = $derived(listItems.find((item) => item.value === value));
	const triggerContent = $derived(selectedItem?.title ?? field.placeholder ?? field.title);

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}

	function handleSelectChange(newValue: string | undefined) {
		if (newValue !== undefined) {
			onUpdate(newValue);
		}
	}

	// Check if we should show list UI (dropdown or radio)
	const hasListOptions = $derived(listItems.length > 0);

	// Auto-reset dependent field value when parent changes and current value is invalid
	$effect(() => {
		// Only for dependent fields with options
		if (!field.list || !isDependentList(field.list)) return;

		const items = listItems; // Track listItems changes

		// If we have a value and options, check if value is valid
		if (value && items.length > 0) {
			const isValid = items.some((item) => item.value === value);

			if (!isValid) {
				// Current value not in new options - reset to first option or initialValue
				const newValue = field.initialValue && items.some((item) => item.value === field.initialValue)
					? field.initialValue
					: items[0]?.value || '';

				console.log(`🔄 Dependent field "${field.name}" reset: "${value}" → "${newValue}"`);
				onUpdate(newValue);
			}
		}
	});
</script>

{#if isDependentFieldWithoutValue()}
	<!-- Show message when dependent field hasn't been selected -->
	<div class="border-muted-foreground/30 bg-muted/30 rounded-md border border-dashed p-4">
		<p class="text-muted-foreground text-sm">
			Please select <span class="font-medium">{dependsOnFieldName()}</span> first
		</p>
	</div>
{:else if hasListOptions}
	{#if layout === 'radio'}
		<!-- Radio Button Layout -->
		<RadioGroup.Root
			value={value || field.initialValue || ''}
			onValueChange={handleSelectChange}
			disabled={readonly}
			class={validationClasses}
		>
			<div class={direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'}>
				{#each listItems as item, index (item.value)}
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value={item.value} id={`${field.name}-${index}`} />
						<Label for={`${field.name}-${index}`}>{item.title}</Label>
					</div>
				{/each}
			</div>
		</RadioGroup.Root>
	{:else}
		<!-- Dropdown/Select Layout -->
		<Select.Root
			type="single"
			name={field.name}
			value={value || field.initialValue || ''}
			onValueChange={handleSelectChange}
			disabled={readonly}
		>
			<Select.Trigger class="w-full {validationClasses}">
				{triggerContent}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					{#if field.title}
						<Select.Label>{field.title}</Select.Label>
					{/if}
					{#each listItems as item (item.value)}
						<Select.Item value={item.value} label={item.title}>
							{item.title}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	{/if}
{:else}
	<!-- Regular Input -->
	<Input
		id={field.name}
		value={value || field.initialValue || ''}
		placeholder={field.placeholder || field.title}
		oninput={handleInputChange}
		onblur={onBlur}
		onfocus={onFocus}
		class={validationClasses}
		disabled={readonly}
	/>
{/if}
