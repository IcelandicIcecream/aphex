<script lang="ts">
	import { Html, Head, Body, Preview, Container, Section, Text, Hr } from 'better-svelte-email';
	import type { Snippet } from 'svelte';

	let { preview = '', children }: { preview?: string; children: Snippet } = $props();
</script>

<Html>
	<Head />
	<Body class="bg-[#f6f9fc] font-sans">
		{#if preview}
			<Preview {preview} />
		{/if}
		<Container class="mx-auto my-10 max-w-[580px] rounded-xl bg-white p-8">
			{@render children()}

			<Hr class="my-6 border-[#e6ebf1]" />

			<Section>
				<Text class="text-[12px] leading-4 text-[#8898aa]">Sent by Aphex CMS</Text>
			</Section>
		</Container>
	</Body>
</Html>
