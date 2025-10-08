<script lang="ts">
	import { AdminApp } from '@aphex/cms-core';

	let { data } = $props();
</script>

<AdminApp
	schemas={data.schemas}
	documentTypes={data.documentTypes}
	schemaError={data.schemaError}
	title="Aphex CMS"
/>
