<script lang="ts">
	import { Sidebar } from '@aphex/cms-core';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	async function handleSignOut() {
		await authClient.signOut();
		goto(resolve('/login'));
	}
</script>

<Sidebar data={data.sidebarData} onSignOut={handleSignOut}>
	{@render children()}
</Sidebar>
