<script lang="ts">
	import { AdminApp } from '@aphex/cms-core';
	import { schemaTypes } from '$lib/schemaTypes/index.js';

	let { data } = $props();
</script>

<AdminApp
	schemas={schemaTypes}
	documentTypes={data.documentTypes}
	schemaError={data.schemaError}
	graphqlSettings={data.graphqlSettings}
	title="Aphex CMS"
/>
