<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { SchemaType } from '../../types/schemas.js';
	import SchemaField from './SchemaField.svelte';

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

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if open}
	<!-- Backdrop: covers content area between header (h-14) and footer -->
	<div
		class="bg-background/80 absolute inset-x-0 top-14 bottom-0 z-50"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	></div>

	<!-- Panel: sits on top of backdrop, inset so content peeks through -->
	<div class="border-border absolute inset-x-4 top-[4.5rem] bottom-4 z-50 flex flex-col overflow-hidden rounded-lg border shadow-lg">
		<div class="border-border bg-background flex items-center justify-between border-b px-4 py-2">
			<span class="text-sm font-medium">Edit {schema.title}</span>
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

		<div class="bg-background flex-1 space-y-3 overflow-auto p-4">
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
{/if}
