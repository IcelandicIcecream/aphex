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
	import type { SchemaType } from '../../types/schemas.js';
	import SchemaField from './SchemaField.svelte';
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
	}

	let {
		open,
		schema,
		value,
		onClose,
		onUpdate,
		onOpenReference,
		readonly = false,
		organizationId
	}: Props = $props();

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
		if (e.key === 'Escape' && isTopmost()) {
			onClose();
		}
	}
</script>

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
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div
				class="border-border bg-background sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-2"
			>
				<span class="text-sm font-medium"
					>Edit {schema.title ?? schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</span
				>
				<div class="flex items-center gap-2">
					{#if saveState}
						{#if saveState.saving}
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

			<div class="bg-background space-y-3 p-4">
				{#if schema.fields}
					{#each schema.fields as field, index (index)}
						<SchemaField
							{field}
							value={(value ?? {})[field.name]}
							documentData={value ?? {}}
							onUpdate={(newValue) => {
								onUpdate({ ...value, [field.name]: newValue });
							}}
							{onOpenReference}
							{readonly}
							{organizationId}
						/>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
