<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useAdminSlots, type AdminSlotName } from '../../admin/slots.svelte';

	type Props = {
		name: AdminSlotName;
		id: string;
		order?: number;
		children: Snippet;
	};

	let { name, id, order = 0, children }: Props = $props();
	const slots = useAdminSlots();

	$effect(() => {
		return slots?.register(name, { id, order, snippet: children });
	});
</script>
