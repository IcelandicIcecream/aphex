<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - God Mode</title>
</svelte:head>

<div class="space-y-8">
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">General</h2>
		<p class="text-muted-foreground text-sm">Identify your instance and get key details.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Instance Information</Card.Title>
			<Card.Description>Details about this Aphex CMS instance</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground text-sm">Admin</span>
					<span class="text-sm font-medium">{data.user.email}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
