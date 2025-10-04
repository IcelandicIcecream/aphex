<script lang="ts">
	import { Badge } from '@aphex/ui/shadcn/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '@aphex/ui/shadcn/card';
	import { Separator } from '@aphex/ui/shadcn/separator';
	import { Button } from '@aphex/ui/shadcn/button';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { SchemaType, Field, ArrayField } from '$lib/cms/types.js';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		schemas: SchemaType[];
	}

	let { schemas }: Props = $props();

	let expandedSchemas = $state<Set<string>>(new Set());

	function toggleSchema(schemaName: string) {
		if (expandedSchemas.has(schemaName)) {
			expandedSchemas.delete(schemaName);
		} else {
			expandedSchemas.add(schemaName);
		}
		expandedSchemas = new SvelteSet(expandedSchemas);
	}

	function getFieldTypeColor(type: string): string {
		const colors = {
			string: 'bg-blue-100 text-blue-800',
			text: 'bg-blue-100 text-blue-800',
			number: 'bg-green-100 text-green-800',
			boolean: 'bg-yellow-100 text-yellow-800',
			slug: 'bg-purple-100 text-purple-800',
			image: 'bg-pink-100 text-pink-800',
			array: 'bg-orange-100 text-orange-800',
			object: 'bg-gray-100 text-gray-800',
			reference: 'bg-red-100 text-red-800'
		};
		return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
	}

	function getSchemaTypeColor(type: 'document' | 'object'): string {
		return type === 'document' ? 'bg-emerald-100 text-emerald-800' : 'bg-cyan-100 text-cyan-800';
	}

	function findReferencedSchemas(field: Field, allSchemas: SchemaType[]): SchemaType[] {
		if (field.type === 'array') {
			const arrayField = field as ArrayField;
			return arrayField.of
				.map((ref) => allSchemas.find((s) => s.name === ref.type))
				.filter(Boolean) as SchemaType[];
		}
		return [];
	}

	const documentTypes = $derived(schemas.filter((s) => s.type === 'document'));
	const objectTypes = $derived(schemas.filter((s) => s.type === 'object'));
</script>

<div class="space-y-6 rounded-lg border bg-slate-50 p-4">
	<div class="flex items-center gap-2">
		<div class="h-3 w-3 rounded-full bg-red-500"></div>
		<h2 class="text-lg font-bold text-slate-700">🔍 Schema Debug Viewer</h2>
		<Badge variant="secondary">{schemas.length} total schemas</Badge>
	</div>

	<!-- Summary Stats -->
	<div class="flex gap-4 text-sm">
		<div class="flex items-center gap-2">
			<Badge class={getSchemaTypeColor('document')}>{documentTypes.length} Documents</Badge>
		</div>
		<div class="flex items-center gap-2">
			<Badge class={getSchemaTypeColor('object')}>{objectTypes.length} Objects</Badge>
		</div>
	</div>

	<Separator />

	<!-- Document Types -->
	{#if documentTypes.length > 0}
		<div class="space-y-3">
			<h3 class="font-semibold text-slate-700">📄 Document Types</h3>
			{#each documentTypes as schema, index (index)}
				{@const isExpanded = expandedSchemas.has(schema.name)}
				<Card class="border-l-4 border-l-emerald-500">
					<CardHeader class="pb-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => toggleSchema(schema.name)}
									class="h-6 w-6 p-1"
								>
									{#if isExpanded}
										<ChevronDown class="h-4 w-4" />
									{:else}
										<ChevronRight class="h-4 w-4" />
									{/if}
								</Button>
								<CardTitle class="text-base">{schema.title}</CardTitle>
								<Badge class={getSchemaTypeColor(schema.type)}>{schema.type}</Badge>
								<code class="rounded bg-slate-100 px-1 text-xs">{schema.name}</code>
							</div>
							<Badge variant="outline">{schema.fields.length} fields</Badge>
						</div>
						{#if schema.description}
							<p class="ml-8 text-sm text-slate-600">{schema.description}</p>
						{/if}
					</CardHeader>

					{#if isExpanded}
						<CardContent class="pt-0">
							<div class="ml-4 space-y-2">
								{#each schema.fields as field, index (index)}
									{@const referencedSchemas = findReferencedSchemas(field, schemas)}

									<div class="border-l-2 border-slate-200 py-1 pl-3">
										<div class="flex flex-wrap items-center gap-2">
											<code class="font-mono text-sm">{field.name}</code>
											<Badge class={getFieldTypeColor(field.type)} variant="outline">
												{field.type}
											</Badge>
											<span class="text-sm text-slate-600">{field.title}</span>
											{#if field.validation}
												<Badge variant="secondary" class="text-xs">validated</Badge>
											{/if}
										</div>

										{#if field.description}
											<p class="mt-1 text-xs text-slate-500">{field.description}</p>
										{/if}

										<!-- Array Type References -->
										{#if field.type === 'array' && referencedSchemas.length > 0}
											<div class="mt-2 border-l border-orange-200 pl-4">
												<p class="mb-1 text-xs text-orange-700">References:</p>
												<div class="flex flex-wrap gap-1">
													{#each referencedSchemas as refSchema, index (index)}
														<Badge variant="outline" class="text-xs">
															{refSchema.title} ({refSchema.name})
														</Badge>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Object Type Fields -->
										{#if field.type === 'object' && 'fields' in field && field.fields}
											<div class="mt-2 border-l border-gray-200 pl-4">
												<p class="mb-1 text-xs text-gray-700">Object fields:</p>
												<div class="space-y-1">
													{#each field.fields as subField, index (index)}
														<div class="flex items-center gap-2">
															<code class="text-xs">{subField.name}</code>
															<Badge
																class={`${getFieldTypeColor(subField.type)} text-xs`}
																variant="outline"
															>
																{subField.type}
															</Badge>
															<span class="text-xs text-slate-500">{subField.title}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</CardContent>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}

	<!-- Object Types -->
	{#if objectTypes.length > 0}
		<Separator />
		<div class="space-y-3">
			<h3 class="font-semibold text-slate-700">🧩 Object Types (Reusable)</h3>
			{#each objectTypes as schema, index (index)}
				{@const isExpanded = expandedSchemas.has(schema.name)}
				<Card class="border-l-4 border-l-cyan-500">
					<CardHeader class="pb-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => toggleSchema(schema.name)}
									class="h-6 w-6 p-1"
								>
									{#if isExpanded}
										<ChevronDown class="h-4 w-4" />
									{:else}
										<ChevronRight class="h-4 w-4" />
									{/if}
								</Button>
								<CardTitle class="text-base">{schema.title}</CardTitle>
								<Badge class={getSchemaTypeColor(schema.type)}>{schema.type}</Badge>
								<code class="rounded bg-slate-100 px-1 text-xs">{schema.name}</code>
							</div>
							<Badge variant="outline">{schema.fields.length} fields</Badge>
						</div>
						{#if schema.description}
							<p class="ml-8 text-sm text-slate-600">{schema.description}</p>
						{/if}
					</CardHeader>

					{#if isExpanded}
						<CardContent class="pt-0">
							<div class="ml-4 space-y-2">
								{#each schema.fields as field, index (index)}
									<div class="border-l-2 border-slate-200 py-1 pl-3">
										<div class="flex flex-wrap items-center gap-2">
											<code class="font-mono text-sm">{field.name}</code>
											<Badge class={getFieldTypeColor(field.type)} variant="outline">
												{field.type}
											</Badge>
											<span class="text-sm text-slate-600">{field.title}</span>
											{#if field.validation}
												<Badge variant="secondary" class="text-xs">validated</Badge>
											{/if}
										</div>

										{#if field.description}
											<p class="mt-1 text-xs text-slate-500">{field.description}</p>
										{/if}
									</div>
								{/each}
							</div>
						</CardContent>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
