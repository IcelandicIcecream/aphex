<script lang="ts">
	import { fade } from 'svelte/transition';

	type Props = {
		container_class?: string;
	};

	const { container_class = '' }: Props = $props();
</script>

<div class="relative {container_class}" transition:fade={{ duration: 100 }}>
	<div
		class="from-muted/50 via-muted/30 absolute flex size-full animate-pulse flex-col items-center bg-linear-to-b to-transparent"
	>
		{#each new Array(3) as _, index (index)}
			<div
				class="border-border group flex w-full items-center justify-between border-b p-3"
				style="opacity: {1 - index * 0.4}"
			>
				<div class="flex min-w-0 flex-1 items-center gap-3">
					<div class="flex items-center justify-center">
						<div class="bg-muted size-6 rounded dark:bg-white/10"></div>
					</div>
					<div class="min-w-0 flex-1">
						<!-- Title -->
						<div class="h-5 w-4/5 pb-0.5">
							<div class="bg-muted h-full w-full rounded dark:bg-white/10"></div>
						</div>
						<!-- Subtitle -->
						<div class="h-4 w-3/5 pt-0.5">
							<div class="bg-muted h-full w-full rounded dark:bg-white/10"></div>
						</div>
					</div>
				</div>
				<!-- Date -->
				<div class="bg-muted h-4 w-1/5 rounded dark:bg-white/10"></div>
			</div>
		{/each}
	</div>
</div>
