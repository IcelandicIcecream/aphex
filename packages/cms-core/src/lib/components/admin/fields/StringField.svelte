<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import * as RadioGroup from '@aphexcms/ui/shadcn/radio-group';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import type { StringField } from '../../../types/schemas';

	interface Props {
		field: StringField;
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

	// Normalize list items to { title, value } format
	const listItems = $derived(
		field.list?.map((item) =>
			typeof item === 'string' ? { title: item.toUpperCase(), value: item } : item
		) || []
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
</script>

{#if field.list && field.list.length > 0}
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
