<script lang="ts">
	import { PluginSettingsPanel } from '@aphexcms/cms-core/client';
	import { plugins } from '$lib/plugins';
</script>

<svelte:head>
	<title>Aphex CMS - Plugin settings</title>
</svelte:head>

<div class="grid gap-5">
	<PluginSettingsPanel {plugins} />
</div>
