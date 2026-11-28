<script lang="ts">
	import '@aphexcms/cms-core/admin.css';
	import { AphexStudio } from '@aphexcms/cms-core/client';
	import { aphexClient } from '$lib/aphex.client';

	let { data } = $props();
</script>

<AphexStudio {data} config={aphexClient} />
