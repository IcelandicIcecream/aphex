<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import * as RadioGroup from '@aphexcms/ui/shadcn/radio-group';
	import * as Tabs from '@aphexcms/ui/shadcn/tabs';
	import { RadioGroup as RadioPrimitive } from 'bits-ui';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import type { StringField, DependentList } from '../../../types/schemas';
	import { cmsLogger } from '../../../utils/logger';
	import { hasRequiredCapabilities } from '../../../schema-utils/required-capabilities';
	import { findPermissions } from '../../../permissions-context.svelte';

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
		/** What the field is while empty (`field.inherits`): shown, never stored. */
		inherited?: unknown;
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
		readonly = false,
		inherited
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

	const permissions = findPermissions();

	// Normalize list items to a uniform { title, value, icon } shape (icon may be undefined).
	// A choice needing a capability the organization lacks is left out, unless it's
	// the stored value, which still shows so it reads true and can be changed.
	const listItems = $derived(
		resolvedList()
			.filter(
				(item) =>
					typeof item === 'string' ||
					item.value === value ||
					hasRequiredCapabilities(item, permissions?.capabilities ?? [])
			)
			.map((item) =>
				typeof item === 'string'
					? { title: item.toUpperCase(), value: item, icon: undefined }
					: { title: item.title, value: item.value, icon: item.icon }
			)
	);

	const layout = $derived(field.options?.layout || 'dropdown');
	const direction = $derived(field.options?.direction || 'vertical');
	const showTitles = $derived(field.options?.showTitles === true);

	// For Select component - derive trigger content
	const selectedItem = $derived(listItems.find((item) => item.value === value));
	/**
	 * With nothing chosen, the trigger shows the default when the field declares
	 * one (an item added before the field existed never got its initial value, but
	 * reads as it), muted so it's clearly not a choice yet. Otherwise a prompt: the
	 * field's title is already the label above, so repeating it read as a value.
	 */
	const defaultItem = $derived(
		typeof field.initialValue === 'string'
			? listItems.find((item) => item.value === field.initialValue)
			: undefined
	);
	/** The option an empty field takes from elsewhere (`field.inherits`), shown muted. */
	const inheritedItem = $derived(
		value ? undefined : listItems.find((item) => item.value === inherited)
	);
	const triggerContent = $derived(
		selectedItem?.title ??
			inheritedItem?.title ??
			field.placeholder ??
			defaultItem?.title ??
			'Choose…'
	);

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onUpdate(target.value);
	}

	/**
	 * From this many choices a dropdown gets a search box, and its list a height of
	 * its own: a select that fills the screen can't be scanned, and scrolls the page
	 * behind it instead of itself.
	 */
	const SEARCH_FROM = 10;
	let pickerOpen = $state(false);

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
					{@const Icon = item.icon}
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value={item.value} id={`${field.name}-${index}`} />
						<Label for={`${field.name}-${index}`}>
							{#if Icon}<Icon class="text-muted-foreground size-4" />{/if}
							{item.title}
						</Label>
					</div>
				{/each}
			</div>
		</RadioGroup.Root>
	{:else if layout === 'cards'}
		<!-- Cards: each choice as a picture of itself (its icon, drawn large) over its
		     name, for choices you recognise by looking: a block's layouts. Arrow keys
		     move between them, as in any radio group. -->
		<RadioPrimitive.Root
			value={value || ''}
			onValueChange={handleSelectChange}
			disabled={readonly}
			class="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2 {validationClasses ?? ''}"
		>
			{#each listItems as item (item.value)}
				{@const Icon = item.icon}
				{@const chosen = item.value === value}
				{@const inheritedChoice = item === inheritedItem}
				<RadioPrimitive.Item
					value={item.value}
					title={inheritedChoice ? `${item.title} (inherited)` : item.title}
					class={[
						'group grid content-start gap-1.5 rounded-md border p-1.5 text-left transition-colors outline-none',
						'focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60',
						chosen
							? 'border-primary bg-primary/5 ring-primary ring-1'
							: inheritedChoice
								? 'border-muted-foreground/40 border-dashed'
								: 'hover:border-foreground/30 hover:bg-muted/40'
					]}
				>
					{#if Icon}
						<span
							class={[
								'bg-muted/60 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm',
								chosen ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
							]}
						>
							<Icon class="size-full" />
						</span>
					{/if}
					<span
						class={[
							'px-0.5 text-xs leading-snug',
							chosen ? 'text-foreground font-medium' : 'text-muted-foreground'
						]}>{item.title}</span
					>
				</RadioPrimitive.Item>
			{/each}
		</RadioPrimitive.Root>
	{:else if layout === 'tabs'}
		<!-- Segmented / tabs layout — icon-friendly (alignment-style pickers). -->
		<Tabs.Root
			value={value || ''}
			onValueChange={(v) => v && handleSelectChange(v)}
			class={validationClasses}
		>
			<!-- Wraps onto a second line rather than running off a narrow screen. -->
			<Tabs.List class="h-auto max-w-full flex-wrap justify-start">
				{#each listItems as item (item.value)}
					{@const Icon = item.icon}
					<!-- The inherited option, while nothing is chosen: outlined, not filled. -->
					<Tabs.Trigger
						value={item.value}
						disabled={readonly}
						title={item === inheritedItem ? `${item.title} (inherited)` : item.title}
						class={item === inheritedItem
							? 'border-muted-foreground/40 text-foreground border-dashed'
							: undefined}
					>
						{#if Icon}
							<Icon class="size-4" />
						{/if}
						<span class={Icon && !showTitles ? 'sr-only' : undefined}>{item.title}</span>
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	{:else if listItems.length >= SEARCH_FROM}
		<!-- A long list: a searchable picker, typing narrows it. -->
		<Popover.Root bind:open={pickerOpen}>
			<Popover.Trigger disabled={readonly}>
				{#snippet child({ props })}
					{@const TriggerIcon = (selectedItem ?? inheritedItem)?.icon}
					<button
						{...props}
						type="button"
						role="combobox"
						aria-expanded={pickerOpen}
						aria-label={field.title}
						class="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 {validationClasses} {selectedItem
							? ''
							: 'text-muted-foreground'}"
					>
						<span class="flex min-w-0 items-center gap-2">
							{#if TriggerIcon}<TriggerIcon class="text-muted-foreground size-4 shrink-0" />{/if}
							<span class="truncate">{triggerContent}</span>
						</span>
						<ChevronDown class="size-4 shrink-0 opacity-50" />
					</button>
				{/snippet}
			</Popover.Trigger>
			<!-- Above dialogs (z-[200], like Select), as wide as the field. -->
			<Popover.Content
				align="start"
				class="z-[200] w-(--bits-popover-anchor-width) min-w-[14rem] p-0"
			>
				<Command.Root>
					<Command.Input placeholder={`Search ${listItems.length} options…`} />
					<Command.List
						class="max-h-[min(18rem,var(--bits-popover-content-available-height))] overflow-y-auto overscroll-contain"
					>
						<Command.Empty>Nothing matches.</Command.Empty>
						<Command.Group>
							{#each listItems as item (item.value)}
								{@const Icon = item.icon}
								<Command.Item
									value={item.value}
									keywords={[item.title]}
									onSelect={() => {
										handleSelectChange(item.value);
										pickerOpen = false;
									}}
								>
									{#if Icon}<Icon class="text-muted-foreground size-4" />{/if}
									<span class="truncate">{item.title}</span>
									{#if item.value === value}<Check class="ml-auto size-4" />{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{:else}
		<!-- Dropdown/Select Layout -->
		<Select.Root
			type="single"
			name={field.name}
			value={value || ''}
			onValueChange={handleSelectChange}
			disabled={readonly}
		>
			<Select.Trigger
				class="w-full {validationClasses} {selectedItem ? '' : 'text-muted-foreground'}"
			>
				{@const TriggerIcon = (selectedItem ?? inheritedItem)?.icon}
				<span class="flex min-w-0 items-center gap-2">
					{#if TriggerIcon}<TriggerIcon class="text-muted-foreground size-4 shrink-0" />{/if}
					<span class="truncate">{triggerContent}</span>
				</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					{#if field.title}
						<Select.Label>{field.title}</Select.Label>
					{/if}
					{#each listItems as item (item.value)}
						{@const Icon = item.icon}
						<Select.Item value={item.value} label={item.title}>
							{#if Icon}<Icon class="text-muted-foreground size-4" />{/if}
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
		placeholder={typeof inherited === 'string' ? inherited : field.placeholder}
		oninput={handleInputChange}
		onblur={onBlur}
		onfocus={onFocus}
		class={validationClasses}
		disabled={readonly}
	/>
{/if}
