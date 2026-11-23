<script lang="ts">
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Tooltip from '@aphexcms/ui/shadcn/tooltip';
	import { ChevronRight, CircleAlert, Info, RotateCcw, TriangleAlert } from '@lucide/svelte';
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
		itemIndexOfMessage,
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

	/**
	 * A list of objects shows its items' problems on their rows, not as a stack of
	 * alerts above it: one empty new item would otherwise put a box per required
	 * field over the list ("Select (item 4) › Name: This is required." and three
	 * more) while it's still being filled in. Inside the item, each field says what's
	 * wrong once it's been touched. Rich text keeps the list: its blocks have no rows.
	 */
	const itemRows = $derived(
		field.type === 'array' && !!field.of && !field.of.some((t) => t.type === 'block')
	);
	const itemProblems = $derived.by(() => {
		const byIndex = new Map<number, string[]>();
		if (!itemRows) return byIndex;
		for (const error of shownErrors) {
			if (error.level !== 'error') continue;
			const index = itemIndexOfMessage(error.message, field.name);
			if (index === null) continue;
			// "Select (item 4) › Name: This is required." -> "Name: This is required."
			const text = humanizeValidationMessage(error.message, { field, value });
			const [, ...rest] = text.split(' › ');
			byIndex.set(index, [...(byIndex.get(index) ?? []), rest.length ? rest.join(' › ') : text]);
		}
		return byIndex;
	});
	const listedErrors = $derived(
		itemRows
			? shownErrors.filter((e) => itemIndexOfMessage(e.message, field.name) === null)
			: shownErrors
	);

	// Computed values
	const hasErrors = $derived(shownErrors.filter((e) => e.level === 'error').length > 0);
	/** The alert by the title: the list's own problems only, as its items flag theirs. */
	const titleAlert = $derived(listedErrors.some((e) => e.level === 'error'));
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
	/**
	 * An on/off field: its checkbox carries its title, so it has no label above it
	 * (that read as the same words twice), and its description sits under the box.
	 */
	const ownLabel = $derived(field.type === 'boolean' && !CustomInput);
	/**
	 * An object of nothing but on/off fields (a dish's dietary marks): a set of
	 * checkboxes under one heading, close together, two to a row where there's room.
	 */
	const checklist = $derived(
		field.type === 'object' &&
			!CustomInput &&
			!field.fieldsets?.length &&
			field.fields?.length &&
			field.fields.every((sub) => sub.type === 'boolean' && !sub.input)
			? field.fields
			: null
	);
	/** A folded checklist still says what's ticked, beside its heading. */
	const ticked = $derived(
		checklist
			? checklist.filter((sub) => value?.[sub.name] === true).map((sub) => sub.title ?? sub.name)
			: []
	);
	const foldable = $derived(!!(objectOptions?.collapsible || objectOptions?.collapsed));
	/** A checklist that folds is drawn like a folding fieldset: its heading inside the box. */
	const foldedBox = $derived(!!checklist && foldable);
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
		<div
			class="flex items-center justify-between"
			hidden={(ownLabel || foldedBox) && !overridden && !titleAlert}
		>
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
				{#if titleAlert}
					<CircleAlert
						class="text-destructive size-4 shrink-0"
						aria-label="This field has a problem"
					/>
				{/if}
			</div>
		</div>

		<!-- Inline description: always in inline mode; in tooltip mode only on mobile
	     (`lg:hidden`), where the desktop info icon is hidden. -->
		<!-- A folded object's description would read as the next field's: it shows unfolded. -->
		{#if field.description && !ownLabel && !foldedBox && !(foldable && !unfolded)}
			<p class="text-muted-foreground text-sm {descriptionMode === 'tooltip' ? 'lg:hidden' : ''}">
				{field.description}
			</p>
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
			{#if checklist && foldedBox}
				<!-- The same box as a folding fieldset (FieldsetSection), so the two read
				     as one thing; folded, it says what's ticked. -->
				<details class="border-border rounded-md border" bind:open={unfolded}>
					<summary
						class="hover:bg-muted/50 flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden"
					>
						<ChevronRight
							class="text-muted-foreground size-4 shrink-0 transition-transform {unfolded
								? 'rotate-90'
								: ''}"
						/>
						<span class="text-sm font-medium">{field.title}</span>
						{#if !unfolded}
							<span class="text-muted-foreground ml-auto truncate text-xs">
								{ticked.length ? ticked.join(', ') : 'None'}
							</span>
						{/if}
					</summary>
					<div class="space-y-3 px-3 pt-1 pb-3">
						{#if field.description}
							<p class="text-muted-foreground text-sm">{field.description}</p>
						{/if}
						<fieldset class="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
							<legend class="sr-only">{field.title}</legend>
							{#each checklist as sub (sub.name)}
								{@render subField(sub)}
							{/each}
						</fieldset>
					</div>
				</details>
			{:else if checklist}
				<fieldset
					class="border-border grid gap-x-6 gap-y-2.5 rounded-md border p-3 sm:grid-cols-2"
					hidden={foldable && !unfolded}
				>
					<legend class="sr-only">{field.title}</legend>
					{#each checklist as sub (sub.name)}
						{@render subField(sub)}
					{/each}
				</fieldset>
			{:else if field.type === 'object' && field.fields && !CustomInput}
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
					{itemProblems}
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
				{#if ownLabel && field.description}
					<p class="text-muted-foreground pl-6 text-xs leading-relaxed">{field.description}</p>
				{/if}
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

		<!-- What's wrong, under the input it's about: a line of small coloured text,
		     never a box, so a message can't be mistaken for another field. -->
		{#if listedErrors.length > 0}
			<ul class="grid gap-1" aria-live="polite">
				{#each listedErrors as error, index (index)}
					{@const Icon =
						error.level === 'error'
							? CircleAlert
							: error.level === 'warning'
								? TriangleAlert
								: Info}
					<li
						class="flex items-start gap-1.5 text-xs {error.level === 'error'
							? 'text-destructive'
							: error.level === 'warning'
								? 'text-amber-700 dark:text-amber-400'
								: 'text-muted-foreground'}"
					>
						<Icon class="mt-px size-3.5 shrink-0" aria-hidden="true" />
						<span>{humanizeValidationMessage(error.message, { field, value })}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
