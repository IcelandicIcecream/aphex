<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import * as RadioGroup from '@aphexcms/ui/shadcn/radio-group';
	import * as Tabs from '@aphexcms/ui/shadcn/tabs';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import type { StringField, DependentList } from '../../../types/schemas';
	import { cmsLogger } from '../../../utils/logger';

	interface Props {
		field: StringField;
		value: any;
		/** The whole document. Root-level fields of a `dependsOn` resolve here. */
		documentData?: Record<string, any>;
		/**
		 * The object this field actually lives in — the array item, or the inline
		 * object — which for a root-level field is just the document again.
		 *
		 * Separate from `documentData` because `dependsOn` names a *sibling*, and a
		 * field nested in an object or array item has no siblings at the root. That
		 * lookup used to be root-only, so a dependent list inside a page-builder
		 * block could never see the field it depended on and rendered permanently
		 * empty.
		 */
		siblingData?: Record<string, any>;
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
		siblingData,
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

	/**
	 * Resolve `dependsOn` against the field's own object scope first, then the
	 * document root.
	 *
	 * Local wins because `dependsOn` means "my sibling", and inside a repeated
	 * array item the local answer is the only correct one — a root field of the
	 * same name would otherwise make every item show the same options. The root
	 * fallback keeps the original behaviour for fields that really are at the top
	 * level, where `siblingData` is the document anyway.
	 */
	function resolveDependency(dependsOn: string): unknown {
		const local = siblingData?.[dependsOn];
		if (local !== undefined) return local;
		return documentData?.[dependsOn];
	}

	// A dependent list with NO scope at all can never resolve — that isn't "nothing
	// selected yet", it's a parent component that failed to pass one, which is exactly
	// how this bug hid: the field renders "Please select X first" forever and looks
	// like ordinary empty state. Absent-but-scoped is not warned about, because an
	// unset field is genuinely absent from the data until it's first written.
	$effect(() => {
		if (!field.list || !isDependentList(field.list)) return;
		if (siblingData === undefined && documentData === undefined) {
			cmsLogger.warn(
				'[StringField]',
				`Field "${field.name}" has a dependent list on "${field.list.dependsOn}" but was rendered with no surrounding data, ` +
					`so it can never resolve. The component rendering it needs to pass siblingData (its object scope).`
			);
		}
	});

	// Resolve the actual list items (either static or dependent)
	const resolvedList = $derived(() => {
		if (!field.list) return [];

		if (Array.isArray(field.list)) {
			// Static list
			return field.list;
		} else if (isDependentList(field.list)) {
			// Dependent list - get options based on dependsOn field value
			const dependentValue = resolveDependency(field.list.dependsOn);
			if (typeof dependentValue !== 'string' || !dependentValue) return [];
			return field.list.options[dependentValue] || [];
		}

		return [];
	});

	// Check if this is a dependent field that's missing its dependency
	const isDependentFieldWithoutValue = $derived(() => {
		if (!field.list) return false;
		if (Array.isArray(field.list)) return false;
		if (isDependentList(field.list)) {
			return !resolveDependency(field.list.dependsOn);
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

	// Normalize list items to a uniform { title, value, icon } shape (icon may be undefined).
	const listItems = $derived(
		resolvedList().map((item) =>
			typeof item === 'string'
				? { title: item.toUpperCase(), value: item, icon: undefined }
				: { title: item.title, value: item.value, icon: item.icon }
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
				// Current value not in new options - reset to first option
				const newValue = items[0]?.value || '';

				cmsLogger.debug(`🔄 Dependent field "${field.name}" reset: "${value}" → "${newValue}"`);
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
			value={value || ''}
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
	{:else if layout === 'tabs'}
		<!-- Segmented / tabs layout — icon-friendly (alignment-style pickers). -->
		<Tabs.Root
			value={value || ''}
			onValueChange={(v) => v && handleSelectChange(v)}
			class={validationClasses}
		>
			<Tabs.List>
				{#each listItems as item (item.value)}
					{@const Icon = item.icon}
					<Tabs.Trigger value={item.value} disabled={readonly} title={item.title}>
						{#if Icon}
							<Icon class="size-4" />
							<span class="sr-only">{item.title}</span>
						{:else}
							{item.title}
						{/if}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	{:else}
		<!-- Dropdown/Select Layout -->
		<Select.Root
			type="single"
			name={field.name}
			value={value || ''}
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
		value={value || ''}
		placeholder={field.placeholder || field.title}
		oninput={handleInputChange}
		onblur={onBlur}
		onfocus={onFocus}
		class={validationClasses}
		disabled={readonly}
	/>
{/if}
