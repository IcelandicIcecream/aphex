<script lang="ts">
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Alert from '@aphexcms/ui/shadcn/alert';
	import * as Tooltip from '@aphexcms/ui/shadcn/tooltip';
	import { ChevronRight, Info, RotateCcw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type {
		Field,
		DateField as DateFieldType,
		DateTimeField as DateTimeFieldType
	} from '../../types/schemas';
	import {
		isFieldRequired,
		validateField,
		getValidationClasses,
		humanizeValidationMessage,
		type ValidationError
	} from '../../field-validation/utils';
	import { isFieldVisible } from '../../schema-utils/visibility';
	import {
		describeValue,
		inheritedValue,
		isEmptyValue,
		overriddenFields
	} from '../../schema-utils/inherit';
	import { filledCount, layoutFields } from '../../schema-utils/fieldsets';
	import FieldsetSection from './FieldsetSection.svelte';
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
		/** The whole document. Stays the document all the way down the tree. */
		documentData?: Record<string, any>;
		/**
		 * The object this field is a member of — the document at the top level, the
		 * object's own value inside an inline object, the item's value inside an array
		 * item. `dependsOn` and a slug's `source` name siblings, so they resolve here
		 * first and fall back to `documentData`.
		 *
		 * Defaults to `documentData`, which makes the root case a no-op for callers.
		 */
		siblingData?: Record<string, any>;
		onUpdate: (value: any) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		doValidation?: () => void;
		schemaType?: string; // Document type
		parentPath?: string; // Parent field path for nested fields
		readonly?: boolean; // Read-only mode for viewers
		organizationId?: string; // Document's organization ID for asset uploads
		/**
		 * How to present `field.description`. `'inline'` (default) shows it as a line
		 * under the label; `'tooltip'` shows an info icon that reveals it on hover/focus.
		 * Object containers pass `'tooltip'` to their subfields so nested groups don't
		 * become a wall of help text.
		 */
		descriptionMode?: 'inline' | 'tooltip';
	}

	let {
		field,
		value,
		documentData,
		siblingData,
		onUpdate,
		onOpenReference,
		doValidation,
		schemaType,
		parentPath,
		readonly = false,
		organizationId,
		descriptionMode = 'inline'
	}: Props = $props();

	// At the root these are the same object; only nesting separates them.
	const scope = $derived(siblingData ?? documentData);

	// Build full field path
	const fieldPath = $derived(parentPath ? `${parentPath}.${field.name}` : field.name);

	// Plugin-provided input widget for this field's `input` key, if any. When set,
	// it replaces the built-in renderer for the field's type.
	const fieldComponents = useFieldComponents();
	const CustomInput = $derived(field.input ? fieldComponents(field.input) : undefined);

	// Validation state for the wrapper (displays errors and status)
	let validationErrors = $state<ValidationError[]>([]);

	/**
	 * Whether this field may show its errors yet. Not until someone has changed it
	 * and left it, or the editor asks to see every problem (the footer's "needs
	 * attention" link, a refused publish). The editor validates every field on load
	 * and after each autosave, and showing those results at once meant a brand-new
	 * document opened with "This is required." under every required field before
	 * anyone had typed — red on the happy path. The errors are still worked out;
	 * Publish stays blocked on them either way.
	 *
	 * Changed, not merely visited: focus leaves an empty field on the way to
	 * something else all the time (clicking a reference field's Create, which fills
	 * it a moment later), and that is no reason to call it wrong.
	 */
	let revealed = $state(false);
	let changed = false;
	const shownErrors = $derived(revealed ? validationErrors : []);

	/** `onUpdate`, noting that this field has been changed. */
	function update(next: any) {
		changed = true;
		onUpdate(next);
	}

	// Real-time validation for wrapper display. `reveal` lets this field show what
	// it finds from now on (see `revealed`).
	export async function performValidation(
		currentValue: any,
		context: any = {},
		options: { reveal?: boolean } = {}
	) {
		if (options.reveal) revealed = true;
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
	const hasErrors = $derived(shownErrors.filter((e) => e.level === 'error').length > 0);
	const validationClasses = $derived(getValidationClasses(hasErrors));

	/**
	 * Conditional visibility. `scope` is the object this field belongs to, which is
	 * what a `hidden` condition almost always means by "the other field" — inside a
	 * repeated array item each row resolves against its own values rather than all
	 * following the first.
	 *
	 * The same `isFieldVisible` runs server-side in `validateFieldSet`, so a hidden
	 * field is skipped by validation too and a required control on the inactive
	 * branch can't block a save with an error nobody can see.
	 */
	const visible = $derived(isFieldVisible(field, scope, documentData));

	// An object can fold away (`options.collapsible`/`collapsed`). Its fields stay
	// mounted while folded, so their validation keeps running.
	const objectOptions = $derived(
		field.type === 'object'
			? (field.options as { collapsible?: boolean; collapsed?: boolean } | undefined)
			: undefined
	);
	const foldable = $derived(!!(objectOptions?.collapsible || objectOptions?.collapsed));
	// svelte-ignore state_referenced_locally
	let unfolded = $state(
		!(field.type === 'object' && (field.options as { collapsed?: boolean } | undefined)?.collapsed)
	);
	/**
	 * Inherited values (`field.inherits`): what an empty field shows, whether it's
	 * been set by hand over that, and, on an object, which of its fields have been.
	 */
	const inherited = $derived(inheritedValue(field, scope, documentData));
	const overridden = $derived(!!field.inherits && !isEmptyValue(value));
	const backTo = $derived(
		field.inherits
			? inherited === undefined
				? `Click to go back to ${field.inherits.from}'s.`
				: `Click to go back to ${field.inherits.from}'s: ${describeValue(field, inherited)}.`
			: ''
	);
	const resettable = $derived(
		field.type === 'object' && Array.isArray(field.fields)
			? overriddenFields(field.fields, value ?? undefined)
			: []
	);
	/** Put a value back to what it inherits, with an Undo in case that wasn't meant. */
	function resetTo(next: any, message: string) {
		const before = value;
		update(next);
		toast(message, { action: { label: 'Undo', onClick: () => update(before) } });
	}
	function resetOne() {
		resetTo(undefined, `${field.title ?? field.name} is back to ${field.inherits?.from}'s`);
	}
	function resetAll() {
		const next = { ...value };
		for (const sub of resettable) delete next[sub.name];
		const count = resettable.length;
		resetTo(
			next,
			`${count} ${count === 1 ? 'setting' : 'settings'} back to ${resettable[0]?.inherits?.from}'s`
		);
	}

	// Validate once focus leaves the field, not only on load and after save, so a
	// field someone has just got wrong says so at once. Leaving a field that was
	// changed is what lets it show errors; see `revealed`.
	function validateOnLeave(event: FocusEvent) {
		const wrapper = event.currentTarget as HTMLElement;
		if (event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget)) return;
		void performValidation(value, documentData ?? {}, { reveal: changed });
	}
</script>

{#snippet subField(sub: Field)}
	<SchemaField
		field={sub}
		value={value?.[sub.name]}
		{documentData}
		siblingData={value ?? {}}
		onUpdate={(subValue) => update({ ...value, [sub.name]: subValue })}
		{doValidation}
		{schemaType}
		parentPath={fieldPath}
		{readonly}
		{organizationId}
		{onOpenReference}
		descriptionMode="tooltip"
	/>
{/snippet}

{#if visible}
	<div
		class="space-y-2"
		data-field-path={fieldPath}
		data-field-error={hasErrors ? '' : undefined}
		onfocusout={validateOnLeave}
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				{#if foldable}
					<button
						type="button"
						class="hover:text-foreground -ml-1 flex items-center gap-1 rounded text-sm font-medium"
						aria-expanded={unfolded}
						onclick={() => (unfolded = !unfolded)}
					>
						<ChevronRight
							class="text-muted-foreground size-4 transition-transform {unfolded
								? 'rotate-90'
								: ''}"
						/>
						{field.title}
					</button>
				{:else}
					<Label for={field.name}>
						{field.title}
						{#if isFieldRequired(field)}
							<span class="text-destructive">*</span>
						{/if}
					</Label>
				{/if}
				{#if overridden}
					<!-- Set here, over what it would inherit: one mark that is also the way back. -->
					{#if readonly}
						<span class="bg-primary size-1.5 rounded-full" title="Changed"></span>
					{:else}
						<Tooltip.Provider delayDuration={150}>
							<Tooltip.Root>
								<Tooltip.Trigger
									class="text-primary hover:text-foreground focus-visible:text-foreground -my-1 inline-flex rounded p-0.5 transition-colors outline-none"
									aria-label="Changed. {backTo}"
									onclick={resetOne}
								>
									<RotateCcw class="size-3.5" />
								</Tooltip.Trigger>
								<Tooltip.Content class="text-xs">Changed. {backTo}</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
				{/if}

				<!-- In tooltip mode (object subfields) the description hides behind an info
			     icon on desktop to keep the group tidy. Desktop only — touch has no hover
			     and the tooltip is unreliable there, so on mobile the description falls
			     back to the inline line below (see `lg:hidden` on the <p>). -->
				{#if descriptionMode === 'tooltip' && field.description}
					<Tooltip.Provider delayDuration={150}>
						<Tooltip.Root>
							<Tooltip.Trigger
								class="text-muted-foreground/60 hover:text-foreground focus-visible:text-foreground -my-1 hidden cursor-help rounded p-1 transition-colors outline-none lg:inline-flex"
								aria-label="More info about {field.title}"
							>
								<Info class="size-3.5" />
							</Tooltip.Trigger>
							<Tooltip.Content class="max-w-xs text-xs leading-relaxed">
								{field.description}
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if resettable.length > 0 && !readonly}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded text-xs"
						onclick={resetAll}
					>
						<RotateCcw class="size-3" />
						Reset all to {resettable[0]?.inherits?.from}'s
					</button>
				{/if}
				{#if hasErrors}
					<span class="text-destructive text-sm">🚨</span>
				{/if}
			</div>
		</div>

		<!-- Inline description: always in inline mode; in tooltip mode only on mobile
	     (`lg:hidden`), where the desktop info icon is hidden. -->
		<!-- A folded object's description would read as the next field's: it shows unfolded. -->
		{#if field.description && !(foldable && !unfolded)}
			<p class="text-muted-foreground text-sm {descriptionMode === 'tooltip' ? 'lg:hidden' : ''}">
				{field.description}
			</p>
		{/if}

		<!-- Validation errors display -->
		{#if shownErrors.length > 0}
			<div class="space-y-2">
				{#each shownErrors as error, index (index)}
					<Alert.Root
						variant={error.level === 'error'
							? 'destructive'
							: error.level === 'warning'
								? 'default'
								: 'default'}
					>
						<Alert.Description class="text-xs">
							{humanizeValidationMessage(error.message, { field, value })}
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
				<!-- Object container: recurse. A custom `input` widget would override this.
			     The field's title is already shown by the <Label> above, so the card is
			     just a bordered group — no repeated heading. -->

				<div class="border-border space-y-6 rounded-md border p-4" hidden={foldable && !unfolded}>
					{#each layoutFields(field.fields, field.fieldsets) as item, index (index)}
						{#if item.kind === 'field'}
							{@render subField(item.field)}
						{:else if item.fields.some((f) => isFieldVisible(f, value ?? {}, documentData))}
							<FieldsetSection fieldset={item.fieldset} filled={filledCount(item.fields, value)}>
								{#each item.fields as f (f.name)}
									{@render subField(f)}
								{/each}
							</FieldsetSection>
						{/if}
					{/each}
				</div>
			{:else if field.type === 'array' && field.of && !CustomInput}
				<!-- Array container (also the block-content editor when `of` has {type:'block'}). -->
				<ArrayField
					{field}
					{value}
					onUpdate={update}
					{onOpenReference}
					{readonly}
					{organizationId}
					{documentData}
				/>
			{:else}
				<!-- Leaf / reference / custom-input fields — resolved uniformly. -->
				<FieldInput
					{field}
					{value}
					onUpdate={update}
					{readonly}
					{validationClasses}
					{documentData}
					siblingData={scope}
					{schemaType}
					{fieldPath}
					{inherited}
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
{/if}
