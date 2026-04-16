<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
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
	<!-- Backdrop - fixed to viewport on mobile (below navbar), relative to parent on desktop -->
	<div
		class="bg-background/80 fixed top-12 right-0 bottom-0 left-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm sm:absolute sm:top-0 sm:p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<Card.Root class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden shadow-lg">
			<Card.Header class="border-b">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>{schema.title}</Card.Title>
						{#if schema.description}
							<Card.Description>{schema.description}</Card.Description>
						{/if}
					</div>
					<Button variant="ghost" size="icon" onclick={onClose}>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</Button>
				</div>
			</Card.Header>

			<Card.Content class="flex-1 overflow-auto p-6">
				<div class="space-y-4">
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
			</Card.Content>

			<Card.Footer class="flex justify-end border-t">
				{#if readonly}
					<Button onclick={onClose}>Close</Button>
				{:else}
					<Button onclick={onClose}>Done</Button>
				{/if}
			</Card.Footer>
		</Card.Root>
	</div>
{/if}
