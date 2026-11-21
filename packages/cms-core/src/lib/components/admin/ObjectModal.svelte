<script lang="ts" module>
	// Module-level modal stack so nested ObjectModals don't fight over click
	// targets and z-index. Plain (non-reactive) variable on purpose — it's
	// only read inside event handlers, never inside derived/effect bodies,
	// so we don't want a write to one modal's open state to retrigger
	// effects in sibling modals.
	let modalStack = 0;
</script>

<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Tooltip from '@aphexcms/ui/shadcn/tooltip';
	import type { Field, SchemaType } from '../../types/schemas.js';
	import SchemaField from './SchemaField.svelte';
	import FieldsetSection from './FieldsetSection.svelte';
	import { filledCount, layoutFields } from '../../schema-utils/fieldsets';
	import { isFieldVisible } from '../../schema-utils/visibility';
	import { getContext, setContext, tick } from 'svelte';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { resolvePreviewTitle } from '../../utils/preview';
	import { getSaveStateContext } from '../../save-state-context.svelte';

	const saveState = getSaveStateContext();

	interface Props {
		open: boolean;
		schema: SchemaType;
		value: Record<string, any>;
		onClose: () => void;
		onUpdate: (value: Record<string, any>) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
		organizationId?: string;
		/**
		 * The document the edited object belongs to. `value` is the sibling scope for
		 * the object's own fields; this is the root fallback, so a `dependsOn` may name
		 * either a field of the object or a field of the document.
		 */
		documentData?: Record<string, any>;
		/**
		 * Show every field's problems as soon as it opens, rather than once each is
		 * changed: the item was opened from a row that said it needs fixing.
		 */
		revealErrors?: boolean;
	}

	let {
		open,
		schema,
		value,
		onClose,
		onUpdate,
		onOpenReference,
		readonly = false,
		organizationId,
		documentData,
		revealErrors = false
	}: Props = $props();

	const fieldRefs: Record<string, SchemaField | undefined> = {};
	let revealedFor: Record<string, any> | null = null;
	$effect(() => {
		if (!open) {
			revealedFor = null;
			return;
		}
		if (!revealErrors) return;
		// Once per opening: what's typed afterwards is checked as usual, on leaving.
		const current = value;
		if (revealedFor && revealedFor._key === current?._key) return;
		revealedFor = current;
		void tick().then(() => {
			for (const [name, ref] of Object.entries(fieldRefs)) {
				ref?.performValidation((current ?? {})[name], documentData ?? {}, { reveal: true });
			}
		});
	});

	/**
	 * The trail of modals this one is nested in (a block › a column › a box), so
	 * the header can say where you are and step back out. Each modal hands its
	 * children the trail with itself added; closing the modal right above an
	 * ancestor returns to it, since the ones above that are rendered inside it.
	 */
	type Crumb = { label: string; typeTitle: string; close: () => void };
	const TRAIL = 'aphex:object-modal-trail';
	const parentTrail = getContext<(() => Crumb[]) | undefined>(TRAIL);
	const label = $derived(resolvePreviewTitle(value ?? {}, schema, schema.name));
	const typeTitle = $derived(
		schema.title ?? schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
	);
	const ancestors = $derived(parentTrail?.() ?? []);
	let labelTipOpen = $state(false);
	/** "Column: Our story", or just the text when it already says what it is. */
	function crumbTip(type: string, text: string): string {
		if (!text) return type;
		return text.toLowerCase().startsWith(type.toLowerCase()) ? text : `${type}: ${text}`;
	}
	setContext(TRAIL, () => [...ancestors, { label, typeTitle, close: onClose }]);

	/** Return to ancestor `index`: close the modal directly above it. */
	function returnTo(index: number) {
		(ancestors[index + 1]?.close ?? onClose)();
	}

	let myDepth = $state(0);

	$effect(() => {
		if (open) {
			modalStack += 1;
			myDepth = modalStack;
			return () => {
				modalStack -= 1;
				myDepth = 0;
			};
		}
	});

	const backdropZ = $derived(50 + Math.max(myDepth - 1, 0) * 10);
	const panelZ = $derived(backdropZ + 1);

	function isTopmost(): boolean {
		return myDepth === modalStack;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target !== e.currentTarget) return;
		if (!isTopmost()) return;
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !e.defaultPrevented && isTopmost()) {
			onClose();
		}
	}

	/**
	 * Esc closes the topmost modal wherever focus is: on the window, in the capture
	 * phase, because the panel stops key events from bubbling and focus is often on
	 * the page behind (after picking an item type from the Add menu). Without it Esc
	 * fell through to the admin's own handler and closed the preview instead.
	 * Claimed with preventDefault so that handler, and the backdrop's, leave it.
	 * A menu or list open inside the modal keeps its own Esc.
	 */
	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || e.defaultPrevented || !open || !isTopmost()) return;
		if (document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]')) return;
		e.preventDefault();
		onClose();
	}

	/**
	 * Opening a referenced document is navigation, so the modal gets out of the
	 * way first.
	 *
	 * Without this the new editor opens *underneath* us: the stacked editor is
	 * part of the admin layout, while this modal is an overlay above it, so the
	 * document the user just asked for is hidden behind a backdrop they have to
	 * dismiss to reach. Nothing is lost by closing — field edits are pushed up
	 * through `onUpdate` as they happen, not held until the modal closes.
	 *
	 * Nested modals unwind on their own: the handler an inner modal receives is
	 * the outer modal's wrapper, so each close cascades outward.
	 */
	function handleOpenReference(documentId: string, documentType: string) {
		onClose();
		onOpenReference?.(documentId, documentType);
	}
</script>

<svelte:window onkeydowncapture={handleWindowKeydown} />

{#if open}
	<div
		class="bg-background/80 absolute inset-0 flex items-center justify-center p-4 lg:p-6"
		style="z-index: {backdropZ}"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="border-border bg-background max-h-full w-full max-w-3xl cursor-default overflow-auto rounded-lg border shadow-lg"
			style="z-index: {panelZ}"
			data-object-modal={myDepth}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div
				class="border-border bg-background sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-2"
			>
				<div class="flex min-w-0 items-center gap-1 text-sm">
					{#if ancestors.length}
						<Button
							variant="ghost"
							size="icon"
							class="-ml-1.5 h-7 w-7 shrink-0"
							aria-label="Back to {ancestors[ancestors.length - 1]?.label}"
							onclick={onClose}
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<!-- Crumbs are cut short to fit, so each names itself in full on hover
						     or focus, and the current one also on a tap (touch has no hover). -->
						<Tooltip.Provider delayDuration={150}>
							<nav aria-label="Where you are" class="flex min-w-0 items-center gap-1">
								{#each ancestors as crumb, index (index)}
									<!-- An ancestor goes by its type (Section, Column): its preview is
									     usually a sentence of its content, and three of those truncated
									     side by side read as nothing. The full preview is the tooltip. -->
									<Tooltip.Root>
										<Tooltip.Trigger
											class="text-muted-foreground hover:text-foreground max-w-[8rem] min-w-[2.5rem] shrink-[4] truncate transition-colors {index <
											ancestors.length - 1
												? 'hidden sm:block'
												: ''}"
											onclick={() => returnTo(index)}
										>
											{crumb.typeTitle}
										</Tooltip.Trigger>
										<Tooltip.Content class="max-w-xs" style="z-index: {panelZ + 1}">
											{crumbTip(crumb.typeTitle, crumb.label)}
										</Tooltip.Content>
									</Tooltip.Root>
									<ChevronRight
										class="text-muted-foreground/60 h-3.5 w-3.5 shrink-0 {index <
										ancestors.length - 1
											? 'hidden sm:block'
											: ''}"
									/>
								{/each}
								<!-- The crumbs give way first: where you are matters more than the
								     way there, so this keeps room for a few words. -->
								<Tooltip.Root bind:open={labelTipOpen} disableCloseOnTriggerClick>
									<Tooltip.Trigger
										class="min-w-[6rem] shrink cursor-default truncate text-left font-medium"
										aria-current="location"
										onclick={() => (labelTipOpen = !labelTipOpen)}
									>
										{label}
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-xs" style="z-index: {panelZ + 1}">
										{crumbTip(typeTitle, label)}
									</Tooltip.Content>
								</Tooltip.Root>
							</nav>
						</Tooltip.Provider>
					{:else}
						<span class="truncate font-medium">{label}</span>
					{/if}
					{#if !label.toLowerCase().startsWith(typeTitle.toLowerCase())}
						<span class="text-muted-foreground hidden shrink-0 text-xs sm:inline"
							>· {typeTitle}</span
						>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if saveState}
						<!-- The same states as the editor's own status, so a dialog never says
						     "Auto-saved" while the document behind it can't save. -->
						{#if saveState.conflict}
							<span
								class="text-destructive inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
							>
								<span class="bg-destructive h-1.5 w-1.5 rounded-full"></span>
								Changed elsewhere
							</span>
						{:else if saveState.retrying && !saveState.saving}
							<span
								class="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap text-amber-600 uppercase"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
								Not saved · retrying
							</span>
						{:else if saveState.saving}
							<span
								class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
							>
								<span class="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full"></span>
								Saving
							</span>
						{:else if saveState.hasUnsavedChanges}
							<span
								class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
							>
								<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
								Unsaved
							</span>
						{:else if saveState.savedAgoText}
							<span
								class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
							>
								<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
								Auto-saved
							</span>
						{/if}
					{/if}
					<Button variant="ghost" size="icon" class="h-7 w-7" onclick={onClose}>
						<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</Button>
				</div>
			</div>

			<!-- Room between settings, and their help behind an info icon (inline on
			     touch), so a dialog reads as controls rather than a wall of text. -->
			<div class="bg-background space-y-5 p-4">
				{#snippet itemField(field: Field)}
					<SchemaField
						bind:this={fieldRefs[field.name]}
						{field}
						value={(value ?? {})[field.name]}
						{documentData}
						siblingData={value ?? {}}
						onUpdate={(newValue) => {
							onUpdate({ ...value, [field.name]: newValue });
						}}
						onOpenReference={onOpenReference ? handleOpenReference : undefined}
						{readonly}
						{organizationId}
						descriptionMode="tooltip"
					/>
				{/snippet}
				{#if schema.fields}
					{#each layoutFields(schema.fields, schema.fieldsets) as item, index (index)}
						{#if item.kind === 'field'}
							{@render itemField(item.field)}
						{:else if item.fields.some((f) => isFieldVisible(f, value ?? {}, documentData))}
							<FieldsetSection fieldset={item.fieldset} filled={filledCount(item.fields, value)}>
								{#each item.fields as f (f.name)}
									{@render itemField(f)}
								{/each}
							</FieldsetSection>
						{/if}
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
