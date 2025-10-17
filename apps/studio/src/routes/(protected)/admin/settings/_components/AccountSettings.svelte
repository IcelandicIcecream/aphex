<script lang="ts">
	import type { CMSUser } from '@aphex/cms-core';

	type Props = {
		user: CMSUser;
	};

	let { user }: Props = $props();
</script>

<div class="mb-6">
	<h2 class="text-xl font-semibold">Account Settings</h2>
	<p class="text-muted-foreground mt-1 text-sm">Manage your profile and preferences</p>
</div>

<div class="text-muted-foreground py-12 text-center">
	<p class="text-lg">Coming soon</p>
	<p class="mt-2 text-sm">Account settings will be available here</p>
</div>
